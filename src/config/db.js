const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('./env');

const normalize = (fp) => String(fp).replace(/[:\s]/g, '').toUpperCase();

/**
 * TLS to the database, strictest option available:
 *  - DB_SSL_CA:          verify the server against this CA file
 *  - DB_SSL_FINGERPRINT: pin the server certificate (for servers whose CA we do not have)
 *  - DB_SSL=true:        verify against the system CAs
 */
function buildSsl() {
  const { sslCa, sslFingerprint, ssl } = env.db;
  if (sslCa) return { ca: fs.readFileSync(path.resolve(__dirname, '../..', sslCa)), rejectUnauthorized: true };
  if (sslFingerprint) return { rejectUnauthorized: false };
  if (ssl) return { rejectUnauthorized: true, minVersion: 'TLSv1.2' };
  return undefined;
}

const pinned = env.db.sslFingerprint && !env.db.sslCa ? normalize(env.db.sslFingerprint) : null;

function inspectPin(connection) {
  const socket = connection.stream;
  const cert = socket && typeof socket.getPeerCertificate === 'function' ? socket.getPeerCertificate() : null;
  const presented = cert && cert.fingerprint256 ? normalize(cert.fingerprint256) : '';
  return {
    ok: presented === pinned,
    presented,
    encrypted: Boolean(socket && socket.encrypted),
    destroyed: Boolean(socket && socket.destroyed),
    reused: Boolean(socket && typeof socket.isSessionReused === 'function' && socket.isSessionReused()),
  };
}

const certMatchesPin = (connection) => inspectPin(connection).ok;

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  dateStrings: true,
  ssl: buildSsl(),
});

/**
 * mysql2 caches TLS sessions per ssl-config object, and a resumed session carries no certificate, so the pin
 * could not be checked on it. Giving every connection its own ssl object forces a full handshake each time.
 */
function forceFullTlsHandshake(corePool) {
  const connectionConfig = corePool.config && corePool.config.connectionConfig;
  if (!connectionConfig || !Object.getOwnPropertyDescriptor(connectionConfig, 'ssl')) {
    throw new Error('DB_SSL_FINGERPRINT pinning is not supported by this mysql2 version; use DB_SSL_CA or DB_SSL=true');
  }
  Object.defineProperty(connectionConfig, 'ssl', { configurable: true, enumerable: true, get: () => buildSsl() });
}

if (pinned) {
  forceFullTlsHandshake(pool.pool);
  pool.pool.on('connection', (connection) => {
    const check = inspectPin(connection);
    if (!check.ok) {
      console.error(
        `DB TLS certificate does not match DB_SSL_FINGERPRINT - refusing this connection ` +
          `(presented=${check.presented || 'none'} encrypted=${check.encrypted} destroyed=${check.destroyed} reused=${check.reused})`
      );
      connection.destroy();
    }
  });
}

/** Standalone connection with the same TLS rules (used by setup scripts that need multiple statements). */
async function openConnection(extra = {}) {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    dateStrings: true,
    ssl: buildSsl(),
    ...extra,
  });
  if (pinned && !certMatchesPin(connection.connection)) {
    connection.destroy();
    throw new Error('DB TLS certificate does not match DB_SSL_FINGERPRINT');
  }
  return connection;
}

module.exports = pool;
module.exports.openConnection = openConnection;
