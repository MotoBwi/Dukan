const pool = require('../config/db');

async function findAll() {
  const [rows] = await pool.query('SELECT id, module, action FROM permissions ORDER BY module, action');
  return rows;
}

module.exports = { findAll };
