const pool = require('../config/db');
const { amountInWords } = require('../utils/amountInWords');

const cents = (v) => Math.round(Number(v) * 100);

/** One invoice per bill: every non-deleted sales line sharing the bill_id. Returns null if the bill has no lines. */
async function getByBill(billId) {
  const [lines] = await pool.query(
    `SELECT s.id, s.bill_id, s.sale_date, s.item_name, s.unit, s.qty, s.price, s.amount, s.paid_amount, s.due_amount,
            s.customer_id, c.name AS customer_name, c.phone AS customer_phone, c.address AS customer_address
       FROM sales s
       JOIN customers c ON c.id = s.customer_id
      WHERE s.bill_id = :billId AND s.deleted_at IS NULL
      ORDER BY s.id`,
    { billId }
  );
  if (lines.length === 0) return null;

  const [[ret]] = await pool.query(
    `SELECT COALESCE(SUM(r.amount), 0) AS returned
       FROM returns r JOIN sales s ON s.id = r.sale_id
      WHERE s.bill_id = :billId AND r.deleted_at IS NULL AND s.deleted_at IS NULL`,
    { billId }
  );

  const subtotal = lines.reduce((sum, l) => sum + cents(l.amount), 0);
  const paid = lines.reduce((sum, l) => sum + cents(l.paid_amount), 0);
  const due = lines.reduce((sum, l) => sum + cents(l.due_amount), 0);
  const returned = cents(ret.returned);

  let status = 'PARTLY PAID';
  if (due <= 0) status = 'PAID';
  else if (paid <= 0) status = 'UNPAID';

  const first = lines[0];
  return {
    invoice_no: Number(billId),
    date: first.sale_date,
    customer: {
      id: first.customer_id,
      name: first.customer_name,
      phone: first.customer_phone,
      address: first.customer_address,
    },
    items: lines.map((l) => ({
      sale_id: l.id,
      item_name: l.item_name,
      unit: l.unit,
      qty: Number(l.qty),
      price: Number(l.price),
      amount: Number(l.amount),
    })),
    totals: {
      subtotal: subtotal / 100,
      returned: returned / 100,
      paid: paid / 100,
      due: due / 100,
      status,
      amount_in_words: amountInWords(subtotal / 100),
    },
  };
}

module.exports = { getByBill };
