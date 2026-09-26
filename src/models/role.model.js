const pool = require('../config/db');

async function findAll() {
  const [rows] = await pool.query('SELECT id, name, description, created_at FROM roles ORDER BY id');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT id, name, description FROM roles WHERE id = :id', { id });
  return rows[0] || null;
}

async function findByName(name) {
  const [rows] = await pool.query('SELECT id, name, description FROM roles WHERE name = :name', { name });
  return rows[0] || null;
}

async function getPermissions(roleId) {
  const [rows] = await pool.query(
    `SELECT p.id, p.module, p.action
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = :roleId
      ORDER BY p.module, p.action`,
    { roleId }
  );
  return rows;
}

async function setPermissions(roleId, permissionIds) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM role_permissions WHERE role_id = :roleId', { roleId });
    if (permissionIds.length > 0) {
      const values = permissionIds.map((pid) => [roleId, pid]);
      await conn.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [values]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function create({ name, description }) {
  const [result] = await pool.query('INSERT INTO roles (name, description) VALUES (:name, :description)', {
    name,
    description: description ?? null,
  });
  return findById(result.insertId);
}

module.exports = { findAll, findById, findByName, getPermissions, setPermissions, create };
