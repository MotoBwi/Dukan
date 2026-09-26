const pool = require('../config/db');
const { recordStockChange } = require('../services/stock.service');

async function findAll({ search = '', limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT id, item_id, item_name, unit, wheels, qty, price, amount, purchase_date, note, created_at
       FROM purchases
      WHERE deleted_at IS NULL
        AND (:search = '' OR item_name LIKE CONCAT('%', :search, '%'))
      ORDER BY id DESC
      LIMIT :limit OFFSET :offset`,
    { search, limit, offset }
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM purchases WHERE id = :id AND deleted_at IS NULL',
    { id }
  );
  return rows[0] || null;
}

async function create({ itemId, itemName, unit, wheels, qty, price, purchaseDate, note, createdBy }) {
  const amount = Number(qty) * Number(price);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO purchases (item_id, item_name, unit, wheels, qty, price, amount, purchase_date, note, created_by)
       VALUES (:itemId, :itemName, :unit, :wheels, :qty, :price, :amount, :purchaseDate, :note, :createdBy)`,
      { itemId, itemName, unit, wheels: wheels ?? null, qty, price, amount, purchaseDate, note: note ?? null, createdBy: createdBy ?? null }
    );
    await recordStockChange(conn, { itemId, refType: 'purchase', refId: result.insertId, qtyChange: qty });
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
  const purchase = await findById(id);
  if (!purchase) return null;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE purchases SET deleted_at = NOW() WHERE id = :id', { id });
    // Reverse the stock effect.
    await recordStockChange(conn, {
      itemId: purchase.item_id,
      refType: 'purchase',
      refId: id,
      qtyChange: -Number(purchase.qty),
    });
    await conn.commit();
    return purchase;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { findAll, findById, create, softDelete };
