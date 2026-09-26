const pool = require('../config/db');

async function findAll({ status = null, limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT r.id, r.customer_id, c.name AS customer_name, c.phone AS customer_phone, r.sale_id, r.title, r.email,
            r.note, r.remind_at, r.status, r.sent_at, r.last_error, r.channel, r.created_at
       FROM reminders r
       LEFT JOIN customers c ON c.id = r.customer_id
      WHERE (:status IS NULL OR r.status = :status)
      ORDER BY r.remind_at ASC
      LIMIT :limit OFFSET :offset`,
    { status, limit, offset }
  );
  return rows;
}

/** Pending reminders whose time has come and that have somewhere to be sent. */
async function findDue(now = new Date()) {
  const [rows] = await pool.query(
    `SELECT * FROM reminders
      WHERE status = 'pending' AND email IS NOT NULL AND remind_at <= :now
      ORDER BY remind_at ASC`,
    { now }
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM reminders WHERE id = :id', { id });
  return rows[0] || null;
}

async function create({ customerId, saleId, title, email, note, remindAt, createdBy }) {
  const [result] = await pool.query(
    `INSERT INTO reminders (customer_id, sale_id, title, email, note, remind_at, channel, created_by)
     VALUES (:customerId, :saleId, :title, :email, :note, :remindAt, 'email', :createdBy)`,
    {
      customerId: customerId ?? null,
      saleId: saleId ?? null,
      title,
      email,
      note: note ?? null,
      remindAt,
      createdBy: createdBy ?? null,
    }
  );
  return findById(result.insertId);
}

async function updateStatus(id, status) {
  await pool.query('UPDATE reminders SET status = :status WHERE id = :id', { id, status });
  return findById(id);
}

async function markSent(id, warning = null) {
  await pool.query("UPDATE reminders SET status = 'done', sent_at = NOW(), last_error = :warning WHERE id = :id", {
    id,
    warning: warning ? String(warning).slice(0, 255) : null,
  });
}

async function markFailed(id, message) {
  await pool.query('UPDATE reminders SET last_error = :message WHERE id = :id', {
    id,
    message: String(message).slice(0, 255),
  });
}

/** Name, phone and current total due for the customer a reminder is about. */
async function getCustomerContext(customerId) {
  const [rows] = await pool.query(
    `SELECT c.name, c.phone, COALESCE(SUM(s.due_amount), 0) AS total_due
       FROM customers c
       LEFT JOIN sales s ON s.customer_id = c.id AND s.deleted_at IS NULL
      WHERE c.id = :customerId
      GROUP BY c.id, c.name, c.phone`,
    { customerId }
  );
  return rows[0] || null;
}

async function remove(id) {
  await pool.query('DELETE FROM reminders WHERE id = :id', { id });
}

module.exports = { findAll, findDue, findById, create, updateStatus, markSent, markFailed, getCustomerContext, remove };
