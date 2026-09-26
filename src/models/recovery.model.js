const pool = require('../config/db');
const { applyPayment } = require('./sale.model');
const ApiError = require('../utils/ApiError');

async function findAll({ customerId = null, limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT rp.id, rp.customer_id, c.name AS customer_name, c.phone AS customer_phone, rp.sale_id, rp.amount,
            rp.payment_mode, rp.collected_by, rp.payment_date, rp.note, rp.created_at
       FROM recovery_payments rp
       JOIN customers c ON c.id = rp.customer_id
      WHERE rp.deleted_at IS NULL
        AND (:customerId IS NULL OR rp.customer_id = :customerId)
      ORDER BY rp.id DESC
      LIMIT :limit OFFSET :offset`,
    { customerId, limit, offset }
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM recovery_payments WHERE id = :id AND deleted_at IS NULL', { id });
  return rows[0] || null;
}

/**
 * Records a payment. If saleId given, applies directly to that sale's due_amount.
 * Otherwise applies FIFO against the customer's oldest outstanding sales.
 */
async function create({ customerId, saleId, amount, paymentMode, collectedBy, paymentDate, note, createdBy }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO recovery_payments (customer_id, sale_id, amount, payment_mode, collected_by, payment_date, note, created_by)
       VALUES (:customerId, :saleId, :amount, :paymentMode, :collectedBy, :paymentDate, :note, :createdBy)`,
      {
        customerId,
        saleId: saleId ?? null,
        amount,
        paymentMode,
        collectedBy,
        paymentDate,
        note: note ?? null,
        createdBy: createdBy ?? null,
      }
    );

    if (saleId) {
      await applyPayment(conn, saleId, amount);
    } else {
      let remaining = Number(amount);
      const [dueSales] = await conn.query(
        `SELECT id, due_amount FROM sales
          WHERE customer_id = :customerId AND deleted_at IS NULL AND due_amount > 0
          ORDER BY sale_date ASC, id ASC
          FOR UPDATE`,
        { customerId }
      );
      for (const sale of dueSales) {
        if (remaining <= 0) break;
        const applyAmount = Math.min(remaining, Number(sale.due_amount));
        await applyPayment(conn, sale.id, applyAmount);
        remaining -= applyAmount;
      }
    }

    await conn.commit();
    return findById(result.insertId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Applies `cents` of extra recovery to due sales (the linked sale, or oldest-first). */
async function allocateMore(conn, rec, cents) {
  const [sales] = rec.sale_id
    ? await conn.query('SELECT id, due_amount FROM sales WHERE id = :id AND deleted_at IS NULL FOR UPDATE', { id: rec.sale_id })
    : await conn.query(
        `SELECT id, due_amount FROM sales
          WHERE customer_id = :customerId AND deleted_at IS NULL AND due_amount > 0
          ORDER BY sale_date ASC, id ASC FOR UPDATE`,
        { customerId: rec.customer_id }
      );
  let remaining = cents;
  for (const s of sales) {
    if (remaining <= 0) break;
    const dueCents = Math.round(Number(s.due_amount) * 100);
    if (dueCents <= 0) continue;
    const apply = Math.min(remaining, dueCents);
    await applyPayment(conn, s.id, apply / 100);
    remaining -= apply;
  }
}

/** Takes back `cents` of recovery from sales (newest first); only the recovery-applied part (paid - initial_paid) can be reversed. */
async function reverseSome(conn, rec, cents) {
  const [sales] = rec.sale_id
    ? await conn.query('SELECT id, paid_amount, initial_paid FROM sales WHERE id = :id AND deleted_at IS NULL FOR UPDATE', { id: rec.sale_id })
    : await conn.query(
        `SELECT id, paid_amount, initial_paid FROM sales
          WHERE customer_id = :customerId AND deleted_at IS NULL AND paid_amount > initial_paid
          ORDER BY sale_date DESC, id DESC FOR UPDATE`,
        { customerId: rec.customer_id }
      );
  let remaining = cents;
  for (const s of sales) {
    if (remaining <= 0) break;
    const recoveredCents = Math.round((Number(s.paid_amount) - Number(s.initial_paid)) * 100);
    if (recoveredCents <= 0) continue;
    const take = Math.min(remaining, recoveredCents);
    await conn.query(
      'UPDATE sales SET paid_amount = paid_amount - :amount, due_amount = due_amount + :amount WHERE id = :id',
      { id: s.id, amount: take / 100 }
    );
    remaining -= take;
  }
}

/** Edits a recovery entry and re-balances the affected sales' paid/due for any change in amount. */
async function update(id, input) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT * FROM recovery_payments WHERE id = :id AND deleted_at IS NULL FOR UPDATE',
      { id }
    );
    const old = rows[0];
    if (!old) throw new ApiError(404, 'Recovery entry not found');

    const oldCents = Math.round(Number(old.amount) * 100);
    const newCents = input.amount !== undefined ? Math.round(Number(input.amount) * 100) : oldCents;
    const delta = newCents - oldCents;

    if (delta > 0) await allocateMore(conn, old, delta);
    else if (delta < 0) await reverseSome(conn, old, -delta);

    await conn.query(
      `UPDATE recovery_payments
          SET amount = :amount, payment_mode = :paymentMode, collected_by = :collectedBy,
              payment_date = :paymentDate, note = :note
        WHERE id = :id`,
      {
        id,
        amount: newCents / 100,
        paymentMode: input.paymentMode ?? old.payment_mode,
        collectedBy: input.collectedBy ?? old.collected_by,
        paymentDate: input.paymentDate ?? old.payment_date,
        note: input.note !== undefined ? input.note || null : old.note,
      }
    );

    await conn.commit();
    return findById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { findAll, findById, create, update };
