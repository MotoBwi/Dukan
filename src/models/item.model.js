const pool = require('../config/db');
const { HIDDEN_ITEM_NAMES } = require('../config/hiddenItems');

async function findAll({ search = '' } = {}) {
  const [rows] = await pool.query(
    `SELECT id, name, default_unit, created_at
       FROM items
      WHERE deleted_at IS NULL
        AND LOWER(TRIM(name)) NOT IN (:hidden)
        AND (:search = '' OR name LIKE CONCAT('%', :search, '%'))
      ORDER BY name`,
    { search, hidden: HIDDEN_ITEM_NAMES }
  );
  return rows;
}

/** Every non-deleted item, including ones hidden from the Items page — used for dropdowns. */
async function findAllOptions() {
  const [rows] = await pool.query(
    `SELECT i.id, i.name, i.default_unit, COALESCE(SUM(sl.qty_change), 0) AS stock
       FROM items i
       LEFT JOIN stock_ledger sl ON sl.item_id = i.id
      WHERE i.deleted_at IS NULL
      GROUP BY i.id, i.name, i.default_unit
      ORDER BY i.name`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT id, name, default_unit FROM items WHERE id = :id AND deleted_at IS NULL', { id });
  return rows[0] || null;
}

async function findByName(name) {
  const [rows] = await pool.query('SELECT id, name, default_unit FROM items WHERE name = :name AND deleted_at IS NULL', { name });
  return rows[0] || null;
}

async function create({ name, defaultUnit }) {
  const [result] = await pool.query('INSERT INTO items (name, default_unit) VALUES (:name, :defaultUnit)', {
    name,
    defaultUnit: defaultUnit ?? null,
  });
  return findById(result.insertId);
}

/** Finds an item by name, creating it if it doesn't exist yet (catalogue grows organically). */
async function findOrCreateByName(name, defaultUnit) {
  const existing = await findByName(name);
  if (existing) return existing;
  return create({ name, defaultUnit });
}

async function update(id, { name, defaultUnit }) {
  await pool.query(
    'UPDATE items SET name = COALESCE(:name, name), default_unit = COALESCE(:defaultUnit, default_unit) WHERE id = :id',
    { id, name: name ?? null, defaultUnit: defaultUnit ?? null }
  );
  return findById(id);
}

async function softDelete(id) {
  await pool.query('UPDATE items SET deleted_at = NOW() WHERE id = :id', { id });
}

/** Current stock balance for an item, derived from stock_ledger. */
async function getStockBalance(id) {
  const [rows] = await pool.query(
    'SELECT COALESCE(SUM(qty_change), 0) AS balance FROM stock_ledger WHERE item_id = :id',
    { id }
  );
  return Number(rows[0].balance);
}

async function getAllStockBalances() {
  const [rows] = await pool.query(
    `SELECT i.id, i.name, i.default_unit, COALESCE(SUM(sl.qty_change), 0) AS balance
       FROM items i
       LEFT JOIN stock_ledger sl ON sl.item_id = i.id
      WHERE i.deleted_at IS NULL
        AND LOWER(TRIM(i.name)) NOT IN (:hidden)
      GROUP BY i.id, i.name, i.default_unit
      ORDER BY i.name`,
    { hidden: HIDDEN_ITEM_NAMES }
  );
  return rows;
}

module.exports = { findAll, findAllOptions, findById, findByName, create, findOrCreateByName, update, softDelete, getStockBalance, getAllStockBalances };
