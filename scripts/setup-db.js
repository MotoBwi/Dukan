const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { openConnection } = require('../src/config/db');
const { generatePassword } = require('./generate-password');

// Accounts created on first setup. Existing accounts are never touched, so re-running this is safe.
const USERS = [
  { name: 'Super Admin', email: 'admin@dukan.local', phone: '0000000000', role: 'SUPER_ADMIN' },
  { name: 'Shop Admin', email: 'shopadmin@dukan.local', phone: '1111111111', role: 'ADMIN' },
];

async function main() {
  const conn = await openConnection({ multipleStatements: true });
  console.log('Connected to the database.');

  for (const file of ['schema.sql', 'seed.sql']) {
    await conn.query(fs.readFileSync(path.join(__dirname, '..', 'database', file), 'utf8'));
    console.log(`Ran ${file}`);
  }

  const created = [];
  for (const u of USERS) {
    const [existing] = await conn.query('SELECT id FROM users WHERE phone = ? OR email = ?', [u.phone, u.email]);
    if (existing.length > 0) {
      console.log(`User ${u.phone} (${u.role}) already exists - left unchanged.`);
      continue;
    }
    const [[role]] = await conn.query('SELECT id FROM roles WHERE name = ?', [u.role]);
    const password = generatePassword();
    await conn.query(
      "INSERT INTO users (name, email, phone, password_hash, role_id, status) VALUES (?, ?, ?, ?, ?, 'active')",
      [u.name, u.email, u.phone, await bcrypt.hash(password, 12), role.id]
    );
    created.push({ role: u.role, login: u.phone, password });
  }

  const [tables] = await conn.query('SHOW TABLES');
  console.log(`Tables: ${tables.length}`);

  if (created.length > 0) {
    console.log('\nNew accounts (these passwords are shown ONCE - save them, then change them in the app):');
    console.table(created);
  }
  await conn.end();
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
