const pool = require('../config/db');
const crypto = require('crypto');

function hash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function store(userId, token, expiresAt) {
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (:userId, :tokenHash, :expiresAt)',
    { userId, tokenHash: hash(token), expiresAt }
  );
}

async function isValid(userId, token) {
  const [rows] = await pool.query(
    `SELECT id FROM refresh_tokens
      WHERE user_id = :userId AND token_hash = :tokenHash AND revoked = 0 AND expires_at > NOW()
      LIMIT 1`,
    { userId, tokenHash: hash(token) }
  );
  return rows.length > 0;
}

/** Seconds since this token was revoked, or null if it is unknown / not revoked. Used to detect token reuse. */
async function revokedAgeSeconds(userId, token) {
  const [rows] = await pool.query(
    `SELECT revoked, TIMESTAMPDIFF(SECOND, revoked_at, NOW()) AS age
       FROM refresh_tokens WHERE user_id = :userId AND token_hash = :tokenHash LIMIT 1`,
    { userId, tokenHash: hash(token) }
  );
  if (!rows[0] || !rows[0].revoked) return null;
  return rows[0].age === null ? Infinity : Number(rows[0].age);
}

async function revoke(userId, token) {
  await pool.query(
    'UPDATE refresh_tokens SET revoked = 1, revoked_at = NOW() WHERE user_id = :userId AND token_hash = :tokenHash AND revoked = 0',
    { userId, tokenHash: hash(token) }
  );
}

async function revokeAllForUser(userId) {
  await pool.query('UPDATE refresh_tokens SET revoked = 1, revoked_at = NOW() WHERE user_id = :userId AND revoked = 0', {
    userId,
  });
}

module.exports = { store, isValid, revokedAgeSeconds, revoke, revokeAllForUser };
