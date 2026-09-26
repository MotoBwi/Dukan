const pool = require('../config/db');

const SALE_FILTER = `(:from IS NULL OR s.sale_date >= :from)
  AND (:to IS NULL OR s.sale_date <= :to)
  AND (:itemId IS NULL OR s.item_id = :itemId)
  AND (:userId IS NULL OR s.created_by = :userId)`;

async function customerSalesSummary({ from = null, to = null, itemId = null, userId = null, search = '' } = {}) {
  const [rows] = await pool.query(
    `SELECT c.id AS customer_id, c.name, c.phone, c.address,
            COUNT(s.id)                       AS sales_count,
            COALESCE(SUM(s.amount), 0)        AS total_amount,
            COALESCE(SUM(s.paid_amount), 0)   AS total_paid,
            COALESCE(SUM(s.due_amount), 0)    AS total_due,
            COALESCE(MAX(rt.returned), 0)     AS total_returned,
            MAX(s.sale_date)                  AS last_sale_date
       FROM sales s
       JOIN customers c ON c.id = s.customer_id
       LEFT JOIN (
         SELECT s.customer_id, SUM(r.amount) AS returned
           FROM returns r
           JOIN sales s ON s.id = r.sale_id
          WHERE r.deleted_at IS NULL AND s.deleted_at IS NULL AND ${SALE_FILTER}
          GROUP BY s.customer_id
       ) rt ON rt.customer_id = c.id
      WHERE s.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND ${SALE_FILTER}
        AND (:search = '' OR c.name LIKE CONCAT('%', :search, '%')
                          OR c.phone LIKE CONCAT('%', :search, '%')
                          OR c.address LIKE CONCAT('%', :search, '%'))
      GROUP BY c.id, c.name, c.phone, c.address
      ORDER BY total_due DESC, total_amount DESC, c.name ASC`,
    { from, to, itemId, userId, search }
  );
  return rows;
}

async function customerSalesDetail(customerId, { from = null, to = null, itemId = null, userId = null } = {}) {
  const [rows] = await pool.query(
    `SELECT s.id, s.sale_date, s.item_name, s.unit, s.qty, s.price, s.amount, s.paid_amount, s.due_amount,
            u.name AS created_by_name
       FROM sales s
       LEFT JOIN users u ON u.id = s.created_by
      WHERE s.customer_id = :customerId AND s.deleted_at IS NULL AND ${SALE_FILTER}
      ORDER BY s.sale_date DESC, s.id DESC`,
    { customerId, from, to, itemId, userId }
  );
  return rows;
}

async function customerRecoveries(customerId, { from = null, to = null, userId = null } = {}) {
  const [rows] = await pool.query(
    `SELECT rp.id, rp.payment_date, rp.amount, rp.payment_mode, rp.collected_by, rp.sale_id, rp.note,
            u.name AS created_by_name
       FROM recovery_payments rp
       LEFT JOIN users u ON u.id = rp.created_by
      WHERE rp.customer_id = :customerId AND rp.deleted_at IS NULL
        AND (:from IS NULL OR rp.payment_date >= :from)
        AND (:to IS NULL OR rp.payment_date <= :to)
        AND (:userId IS NULL OR rp.created_by = :userId)
      ORDER BY rp.payment_date DESC, rp.id DESC`,
    { customerId, from, to, userId }
  );
  return rows;
}

const ORDER = { SALE: 0, PAID: 1, RETURN: 2, RECOVERY: 3 };
const cents = (v) => Math.round(Number(v) * 100);

/**
 * Chronological statement for one customer. Debit = goods sold; credit = money received at sale,
 * returns, and recovery payments. Running balance > 0 means the customer owes us.
 */
async function customerLedger(customerId, { from = null, to = null } = {}) {
  const [[sales], [returns], [recoveries]] = await Promise.all([
    pool.query(
      `SELECT id, bill_id, sale_date, item_name, unit, qty, price, amount, initial_paid
         FROM sales WHERE customer_id = :customerId AND deleted_at IS NULL`,
      { customerId }
    ),
    pool.query(
      `SELECT r.id, r.sale_id, s.bill_id, r.return_date, r.qty, r.unit, r.amount, r.reason, s.item_name
         FROM returns r JOIN sales s ON s.id = r.sale_id
        WHERE s.customer_id = :customerId AND r.deleted_at IS NULL AND s.deleted_at IS NULL`,
      { customerId }
    ),
    pool.query(
      `SELECT id, payment_date, amount, payment_mode, collected_by, note
         FROM recovery_payments WHERE customer_id = :customerId AND deleted_at IS NULL`,
      { customerId }
    ),
  ]);

  const events = [];

  for (const s of sales) {
    events.push({
      date: s.sale_date,
      type: 'SALE',
      id: s.id,
      ref: s.bill_id ? `Bill #${s.bill_id}` : `Sale #${s.id}`,
      particulars: `${s.item_name} — ${Number(s.qty)} ${s.unit} × ₹${Number(s.price)}`,
      debit: cents(s.amount),
      credit: 0,
    });
  }

  const paidByBill = new Map();
  for (const s of sales) {
    if (cents(s.initial_paid) <= 0) continue;
    const key = s.bill_id ?? `s${s.id}`;
    const entry = paidByBill.get(key) || { date: s.sale_date, id: s.id, ref: s.bill_id ? `Bill #${s.bill_id}` : `Sale #${s.id}`, credit: 0 };
    entry.credit += cents(s.initial_paid);
    entry.id = Math.min(entry.id, s.id);
    paidByBill.set(key, entry);
  }
  for (const p of paidByBill.values()) {
    events.push({ date: p.date, type: 'PAID', id: p.id, ref: p.ref, particulars: 'Received with bill', debit: 0, credit: p.credit });
  }

  for (const r of returns) {
    events.push({
      date: r.return_date,
      type: 'RETURN',
      id: r.id,
      ref: r.bill_id ? `Bill #${r.bill_id}` : `Sale #${r.sale_id}`,
      particulars: `Return — ${r.item_name} ${Number(r.qty)} ${r.unit}${r.reason ? ` (${r.reason})` : ''}`,
      debit: 0,
      credit: cents(r.amount),
    });
  }

  for (const p of recoveries) {
    events.push({
      date: p.payment_date,
      type: 'RECOVERY',
      id: p.id,
      ref: `Recovery #${p.id}`,
      particulars: `Recovery — ${p.payment_mode}${p.collected_by ? `, collected by ${p.collected_by}` : ''}${p.note ? ` (${p.note})` : ''}`,
      debit: 0,
      credit: cents(p.amount),
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date) || ORDER[a.type] - ORDER[b.type] || a.id - b.id);

  let balance = 0;
  let opening = 0;
  const entries = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const e of events) {
    balance += e.debit - e.credit;
    if (from && e.date < from) {
      opening = balance;
      continue;
    }
    if (to && e.date > to) continue;
    totalDebit += e.debit;
    totalCredit += e.credit;
    entries.push({
      date: e.date,
      type: e.type,
      ref: e.ref,
      particulars: e.particulars,
      debit: e.debit / 100,
      credit: e.credit / 100,
      balance: balance / 100,
    });
  }

  const closing = entries.length ? Math.round(entries[entries.length - 1].balance * 100) : opening;

  return {
    opening_balance: opening / 100,
    entries,
    total_debit: totalDebit / 100,
    total_credit: totalCredit / 100,
    closing_balance: closing / 100,
  };
}

module.exports = { customerSalesSummary, customerSalesDetail, customerRecoveries, customerLedger };
