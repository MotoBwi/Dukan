const bcrypt = require('bcrypt');
const pool = require('../src/config/db');
const { password: passwordRule } = require('../src/validators/common.validator');
const { generatePassword } = require('./generate-password');

// Usage: npm run reset-password -- <phone-or-email> [new-password]
// Without a new password a strong random one is generated and printed once.
async function main() {
  const [identifier, provided] = process.argv.slice(2);
  if (!identifier) {
    console.error('Usage: npm run reset-password -- <phone-or-email> [new-password]');
    process.exit(1);
  }

  const password = provided || generatePassword();
  const check = passwordRule.safeParse(password);
  if (!check.success) {
    console.error(`Password rejected: ${check.error.issues[0].message}`);
    process.exit(1);
  }

  const [rows] = await pool.query('SELECT id, name FROM users WHERE phone = ? OR email = ?', [identifier, identifier]);
  if (rows.length === 0) {
    console.error('No user found with that phone/email.');
    process.exit(1);
  }

  const { id, name } = rows[0];
  await pool.query('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL, status = ? WHERE id = ?', [
    await bcrypt.hash(password, 12),
    'active',
    id,
  ]);
  await pool.query('UPDATE refresh_tokens SET revoked = 1, revoked_at = NOW() WHERE user_id = ? AND revoked = 0', [id]);

  console.log(`Password reset for ${name} (${identifier}); all their sessions were signed out.`);
  if (!provided) console.log(`New password (shown once): ${password}`);
  await pool.end();
}

main().catch((err) => {
  console.error('Reset failed:', err.message);
  process.exit(1);
});
