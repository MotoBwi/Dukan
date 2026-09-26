require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function strongSecret(name) {
  const value = required(name);
  if (value.length < 32 || /change_?me/i.test(value)) {
    throw new Error(
      `${name} is too weak. Use at least 32 random characters, e.g.: ` +
        `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
    );
  }
  return value;
}

function parseOrigins(raw) {
  const origins = raw.split(',').map((o) => o.trim()).filter(Boolean);
  if (origins.length === 0 || origins.includes('*')) {
    throw new Error('CORS_ORIGIN must list explicit origins (comma separated), never *');
  }
  return origins;
}

function parseTrustProxy(raw) {
  if (raw === undefined || raw === '') return false;
  if (raw === 'true') return true;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}

const accessSecret = strongSecret('JWT_ACCESS_SECRET');
const refreshSecret = strongSecret('JWT_REFRESH_SECRET');
if (accessSecret === refreshSecret) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  port: Number(process.env.PORT || 4000),

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: required('DB_USER'),
    password: process.env.DB_PASSWORD || '',
    database: required('DB_NAME'),
    ssl: process.env.DB_SSL === 'true',
    sslCa: process.env.DB_SSL_CA || '',
    sslFingerprint: process.env.DB_SSL_FINGERPRINT || '',
  },

  jwt: {
    accessSecret,
    refreshSecret,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  corsOrigins: parseOrigins(process.env.CORS_ORIGIN || 'http://localhost:5173'),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd,

  maxFailedLogins: Number(process.env.MAX_FAILED_LOGINS || 5),
  lockoutMinutes: Number(process.env.LOCKOUT_MINUTES || 15),
};
