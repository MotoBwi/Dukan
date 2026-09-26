const pool = require('../config/db');

const PUBLIC_COLUMNS = `u.id, u.name, u.username, u.email, u.phone, u.role_id, r.name AS role_name, u.status, u.created_at`;

async function findAll({ limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users u JOIN roles r ON r.id = u.role_id
     ORDER BY u.id DESC LIMIT :limit OFFSET :offset`,
    { limit, offset }
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = :id`,
    { id }
  );
  return rows[0] || null;
}

/**
 * Login lookup by username, phone or email (all compared case-insensitively). Includes the password hash and the
 * lockout state, so never send this row to a client.
 */
async function findByLogin(identifier) {
  const [rows] = await pool.query(
    `SELECT u.*, r.name AS role_name,
            (u.locked_until IS NOT NULL AND u.locked_until > NOW()) AS is_locked,
            GREATEST(TIMESTAMPDIFF(MINUTE, NOW(), u.locked_until), 0) + 1 AS lock_minutes
       FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.username = :identifier OR u.phone = :identifier OR u.email = :identifier
      LIMIT 1`,
    { identifier }
  );
  return rows[0] || null;
}

async function create({ name, username, email, phone, passwordHash, roleId }) {
  const [result] = await pool.query(
    `INSERT INTO users (name, username, email, phone, password_hash, role_id)
     VALUES (:name, :username, :email, :phone, :passwordHash, :roleId)`,
    { name, username: username ?? null, email: email ?? null, phone, passwordHash, roleId }
  );
  return findById(result.insertId);
}

async function update(id, { name, username, email, phone, roleId, status }) {
  await pool.query(
    `UPDATE users
        SET name = COALESCE(:name, name),
            username = COALESCE(:username, username),
            email = COALESCE(:email, email),
            phone = COALESCE(:phone, phone),
            role_id = COALESCE(:roleId, role_id),
            status = COALESCE(:status, status)
      WHERE id = :id`,
    {
      id,
      name: name ?? null,
      username: username ?? null,
      email: email ?? null,
      phone: phone ?? null,
      roleId: roleId ?? null,
      status: status ?? null,
    }
  );
  return findById(id);
}

async function updatePassword(id, passwordHash) {
  await pool.query(
    'UPDATE users SET password_hash = :passwordHash, failed_attempts = 0, locked_until = NULL WHERE id = :id',
    { id, passwordHash }
  );
}

async function remove(id) {
  await pool.query("UPDATE users SET status = 'disabled' WHERE id = :id", { id });
}

/** Counts a wrong password; once `maxAttempts` is reached the account is locked for `lockMinutes`. */
async function recordFailedLogin(id, maxAttempts, lockMinutes) {
  await pool.query(
    `UPDATE users
        SET failed_attempts = LEAST(failed_attempts + 1, 200),
            locked_until = IF(failed_attempts >= :maxAttempts, DATE_ADD(NOW(), INTERVAL :lockMinutes MINUTE), locked_until)
      WHERE id = :id`,
    { id, maxAttempts, lockMinutes }
  );
}

async function resetFailedLogins(id) {
  await pool.query('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = :id', { id });
}

async function countActiveSuperAdmins() {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n FROM users u JOIN roles r ON r.id = u.role_id
      WHERE r.name = 'SUPER_ADMIN' AND u.status = 'active'`
  );
  return Number(rows[0].n);
}

module.exports = {
  findAll,
  findById,
  findByLogin,
  create,
  update,
  updatePassword,
  remove,
  recordFailedLogin,
  resetFailedLogins,
  countActiveSuperAdmins,
};
