const pool = require('../config/db');
const { recordStockChange } = require('../services/stock.service');
const ApiError = require('../utils/ApiError');

async function findAll({ limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT r.id, r.sale_id, s.bill_id, s.customer_id, c.name AS customer_name, c.phone AS customer_phone,
            r.item_id, s.item_name, r.unit, r.qty, r.price, r.amount, r.return_date, r.reason, r.created_at
       FROM returns r
       JOIN sales s ON s.id = r.sale_id
       JOIN customers c ON c.id = s.customer_id
      WHERE r.deleted_at IS NULL
      ORDER BY r.id DESC LIMIT :limit OFFSET :offset`,
    { limit, offset }
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM returns WHERE id = :id AND deleted_at IS NULL', { id });
  return rows[0] || null;
}

/**
 * Return is always linked to a sale ("Auto by sales" in the PDF): unit/item are taken from
 * the sale, qty/price default to the sale's line, reverses stock, reduces the sale's due amount.
 */
async function create({ saleId, qty, price, returnDate, reason, createdBy }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [saleRows] = await conn.query('SELECT * FROM sales WHERE id = :id AND deleted_at IS NULL FOR UPDATE', {
      id: saleId,
    });
    const sale = saleRows[0];
    if (!sale) throw new ApiError(404, 'Sale not found for return');

    const returnQty = Number(qty ?? sale.qty);
    const returnPrice = Number(price ?? sale.price);
    const amount = returnQty * returnPrice;

    const [[prev]] = await conn.query(
      'SELECT COALESCE(SUM(qty), 0) AS returned FROM returns WHERE sale_id = :saleId AND deleted_at IS NULL',
      { saleId }
    );
    if (Math.round((Number(prev.returned) + returnQty) * 100) > Math.round(Number(sale.qty) * 100)) {
      throw new ApiError(
        400,
        `Cannot return more than sold: ${Number(sale.qty)} sold, ${Number(prev.returned)} already returned`
      );
    }

    const [result] = await conn.query(
      `INSERT INTO returns (sale_id, item_id, unit, qty, price, amount, return_date, reason, created_by)
       VALUES (:saleId, :itemId, :unit, :qty, :price, :amount, :returnDate, :reason, :createdBy)`,
      {
        saleId,
        itemId: sale.item_id,
        unit: sale.unit,
        qty: returnQty,
        price: returnPrice,
        amount,
        returnDate,
        reason: reason ?? null,
        createdBy: createdBy ?? null,
      }
    );

    await recordStockChange(conn, { itemId: sale.item_id, refType: 'return', refId: result.insertId, qtyChange: returnQty });

    // Returning goods reduces what the customer owes for that sale (down to zero).
    const dueReduction = Math.min(amount, Number(sale.due_amount));
    await conn.query('UPDATE sales SET due_amount = due_amount - :amount WHERE id = :id', {
      id: saleId,
      amount: dueReduction,
    });

    await conn.commit();
    return findById(result.insertId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function softDelete(id) {
  const ret = await findById(id);
  if (!ret) return null;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE returns SET deleted_at = NOW() WHERE id = :id', { id });
    await recordStockChange(conn, { itemId: ret.item_id, refType: 'return', refId: id, qtyChange: -Number(ret.qty) });
    await conn.query('UPDATE sales SET due_amount = due_amount + :amount WHERE id = :id', {
      id: ret.sale_id,
      amount: ret.amount,
    });
    await conn.commit();
    return ret;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { findAll, findById, create, softDelete };
