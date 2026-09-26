const pool = require('../config/db');
const { recordStockChange } = require('../services/stock.service');

async function findAll({ customerId = null, limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT s.id, s.customer_id, c.name AS customer_name, s.bill_id, s.item_id, s.item_name, s.unit, s.qty, s.price,
            s.amount, s.paid_amount, s.due_amount, s.sale_date, s.note, s.created_at
       FROM sales s
       JOIN customers c ON c.id = s.customer_id
      WHERE s.deleted_at IS NULL
        AND (:customerId IS NULL OR s.customer_id = :customerId)
      ORDER BY s.id DESC
      LIMIT :limit OFFSET :offset`,
    { customerId, limit, offset }
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM sales WHERE id = :id AND deleted_at IS NULL', { id });
  return rows[0] || null;
}

/**
 * Creates one sales row per line in a single transaction. The bill's paid amount is applied
 * to the lines in order, so each line's paid/due stays consistent for reports, returns and recovery.
 */
async function createBill({ customerId, saleDate, note, paidAmount, lines, createdBy }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let remainingPaid = Math.round(Number(paidAmount ?? 0) * 100);
    const ids = [];

    for (const line of lines) {
      const amountCents = Math.round(Number(line.qty) * Number(line.price) * 100);
      const paidCents = Math.min(remainingPaid, amountCents);
      remainingPaid -= paidCents;

      const [result] = await conn.query(
        `INSERT INTO sales (customer_id, item_id, item_name, unit, qty, price, amount, paid_amount, initial_paid, due_amount, sale_date, note, created_by)
         VALUES (:customerId, :itemId, :itemName, :unit, :qty, :price, :amount, :paid, :paid, :due, :saleDate, :note, :createdBy)`,
        {
          customerId,
          itemId: line.itemId,
          itemName: line.itemName,
          unit: line.unit,
          qty: line.qty,
          price: line.price,
          amount: amountCents / 100,
          paid: paidCents / 100,
          due: (amountCents - paidCents) / 100,
          saleDate,
          note: note ?? null,
          createdBy: createdBy ?? null,
        }
      );
      await recordStockChange(conn, {
        itemId: line.itemId,
        refType: 'sale',
        refId: result.insertId,
        qtyChange: -Number(line.qty),
      });
      ids.push(result.insertId);
    }

    await conn.query('UPDATE sales SET bill_id = :billId WHERE id IN (:ids)', { billId: ids[0], ids });
    const [rows] = await conn.query('SELECT * FROM sales WHERE id IN (:ids) ORDER BY id', { ids });

    await conn.commit();
    return rows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Applies a recovery payment against a sale's due_amount. Called from recovery.model within its own connection. */
async function applyPayment(conn, saleId, paymentAmount) {
  await conn.query(
    'UPDATE sales SET paid_amount = paid_amount + :amount, due_amount = due_amount - :amount WHERE id = :id',
    { id: saleId, amount: paymentAmount }
  );
}

async function softDelete(id) {
  const sale = await findById(id);
  if (!sale) return null;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE sales SET deleted_at = NOW() WHERE id = :id', { id });
    await recordStockChange(conn, { itemId: sale.item_id, refType: 'sale', refId: id, qtyChange: Number(sale.qty) });
    await conn.commit();
    return sale;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { findAll, findById, createBill, applyPayment, softDelete };
