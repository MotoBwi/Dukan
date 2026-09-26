const pool = require('../config/db');

const cents = (v) => Math.round(Number(v || 0) * 100);

// Grouping expressions come from this fixed map only - never from user input.
const PERIOD_FORMAT = { month: '%Y-%m', year: '%Y' };

const periodKey = (column, granularity) =>
  granularity === 'all' ? "'all'" : `DATE_FORMAT(${column}, '${PERIOD_FORMAT[granularity]}')`;

const yearFilter = (column, year) => (year ? `AND YEAR(${column}) = :year` : '');

/** Adds the derived figures to a bucket of raw sums (all in paise). */
function finish(period, raw) {
  const revenue = raw.sales - raw.returns;
  return {
    period,
    purchases: raw.purchases / 100,
    sales: raw.sales / 100,
    returns: raw.returns / 100,
    revenue: revenue / 100,
    profit: (revenue - raw.purchases) / 100, // negative = loss
    received: (raw.paidAtSale + raw.recovered) / 100,
    pending: raw.pending / 100,
  };
}

const emptyRaw = () => ({ purchases: 0, sales: 0, returns: 0, paidAtSale: 0, recovered: 0, pending: 0 });

async function bucketRows(granularity, year = null) {
  const params = { year };
  const [[purchases], [sales], [returns], [recoveries]] = await Promise.all([
    pool.query(
      `SELECT ${periodKey('purchase_date', granularity)} AS k, SUM(amount) AS total
         FROM purchases WHERE deleted_at IS NULL ${yearFilter('purchase_date', year)} GROUP BY k`,
      params
    ),
    pool.query(
      `SELECT ${periodKey('sale_date', granularity)} AS k, SUM(amount) AS total,
              SUM(initial_paid) AS paid_at_sale, SUM(due_amount) AS pending
         FROM sales WHERE deleted_at IS NULL ${yearFilter('sale_date', year)} GROUP BY k`,
      params
    ),
    pool.query(
      `SELECT ${periodKey('r.return_date', granularity)} AS k, SUM(r.amount) AS total
         FROM returns r JOIN sales s ON s.id = r.sale_id
        WHERE r.deleted_at IS NULL AND s.deleted_at IS NULL ${yearFilter('r.return_date', year)} GROUP BY k`,
      params
    ),
    pool.query(
      `SELECT ${periodKey('payment_date', granularity)} AS k, SUM(amount) AS total
         FROM recovery_payments WHERE deleted_at IS NULL ${yearFilter('payment_date', year)} GROUP BY k`,
      params
    ),
  ]);

  const buckets = new Map();
  const bucket = (k) => {
    if (!buckets.has(k)) buckets.set(k, emptyRaw());
    return buckets.get(k);
  };
  for (const r of purchases) bucket(r.k).purchases += cents(r.total);
  for (const r of sales) {
    const b = bucket(r.k);
    b.sales += cents(r.total);
    b.paidAtSale += cents(r.paid_at_sale);
    b.pending += cents(r.pending);
  }
  for (const r of returns) bucket(r.k).returns += cents(r.total);
  for (const r of recoveries) bucket(r.k).recovered += cents(r.total);
  return buckets;
}

function sumTotals(rows) {
  const t = rows.reduce(
    (acc, r) => ({
      purchases: acc.purchases + cents(r.purchases),
      sales: acc.sales + cents(r.sales),
      returns: acc.returns + cents(r.returns),
      paidAtSale: acc.paidAtSale + cents(r.received),
      recovered: acc.recovered,
      pending: acc.pending + cents(r.pending),
    }),
    emptyRaw()
  );
  return finish('total', t);
}

async function summary() {
  const buckets = await bucketRows('all');
  const raw = buckets.get('all') || emptyRaw();
  return finish('all', raw);
}

async function monthly(year) {
  const buckets = await bucketRows('month', year);
  const rows = [];
  for (let m = 1; m <= 12; m += 1) {
    const key = `${year}-${String(m).padStart(2, '0')}`;
    rows.push({ month: m, ...finish(key, buckets.get(key) || emptyRaw()) });
  }
  return { year, rows, totals: sumTotals(rows) };
}

async function yearly() {
  const buckets = await bucketRows('year');
  const rows = [...buckets.keys()]
    .sort()
    .map((key) => ({ year: Number(key), ...finish(key, buckets.get(key)) }));
  return { rows, totals: sumTotals(rows) };
}

/** Years that have any activity, newest first (for the year picker). */
async function activeYears() {
  const [rows] = await pool.query(
    `SELECT y FROM (
        SELECT YEAR(purchase_date) AS y FROM purchases WHERE deleted_at IS NULL
        UNION SELECT YEAR(sale_date) FROM sales WHERE deleted_at IS NULL
        UNION SELECT YEAR(return_date) FROM returns WHERE deleted_at IS NULL
        UNION SELECT YEAR(payment_date) FROM recovery_payments WHERE deleted_at IS NULL
     ) t ORDER BY y DESC`
  );
  return rows.map((r) => Number(r.y));
}

module.exports = { summary, monthly, yearly, activeYears };
