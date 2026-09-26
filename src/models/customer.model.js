const pool = require('../config/db');

async function findAll({ search = '', limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT id, name, age, phone, address, created_at
       FROM customers
      WHERE deleted_at IS NULL
        AND (:search = '' OR name LIKE CONCAT('%', :search, '%') OR phone LIKE CONCAT('%', :search, '%') OR address LIKE CONCAT('%', :search, '%'))
      ORDER BY id DESC
      LIMIT :limit OFFSET :offset`,
    { search, limit, offset }
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, age, phone, address, created_at FROM customers WHERE id = :id AND deleted_at IS NULL',
    { id }
  );
  return rows[0] || null;
}

async function create({ name, age, phone, address, createdBy }) {
  const [result] = await pool.query(
    `INSERT INTO customers (name, age, phone, address, created_by)
     VALUES (:name, :age, :phone, :address, :createdBy)`,
    { name, age: age ?? null, phone, address: address ?? null, createdBy: createdBy ?? null }
  );
  return findById(result.insertId);
}

async function update(id, { name, age, phone, address }) {
  await pool.query(
    `UPDATE customers
        SET name = COALESCE(:name, name),
            age = COALESCE(:age, age),
            phone = COALESCE(:phone, phone),
            address = COALESCE(:address, address)
      WHERE id = :id AND deleted_at IS NULL`,
    { id, name: name ?? null, age: age ?? null, phone: phone ?? null, address: address ?? null }
  );
  return findById(id);
}

async function softDelete(id) {
  await pool.query('UPDATE customers SET deleted_at = NOW() WHERE id = :id', { id });
}

/** Total due across all sales for this customer (amount - paid), used by dashboard + recovery. */
async function getDueBalance(id) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(due_amount), 0) AS due_balance
       FROM sales WHERE customer_id = :id AND deleted_at IS NULL`,
    { id }
  );
  return Number(rows[0].due_balance);
}

module.exports = { findAll, findById, create, update, softDelete, getDueBalance };
