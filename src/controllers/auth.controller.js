const crypto = require('crypto');
const bcrypt = require('bcrypt');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const pool = require('../config/db');
const userModel = require('../models/user.model');
const refreshTokenModel = require('../models/refreshToken.model');
const roleModel = require('../models/role.model');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const COOKIE_NAME = 'dukan_rt';
const COOKIE_PATH = '/api/v1/auth';
const REUSE_GRACE_SECONDS = 30;

// Compared against when the account does not exist, so "unknown user" takes as long as "wrong password".
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 12);

function msFromExpiry(expiresIn) {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 15 * 60 * 1000;
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return Number(match[1]) * unit;
}

const cookieOptions = () => ({ httpOnly: true, secure: env.cookieSecure, sameSite: 'strict', path: COOKIE_PATH });

function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/** The refresh cookie is sent automatically by browsers, so cookie-authenticated calls must also carry a custom header
 *  (which a cross-site form or image request cannot add). */
function requireAjaxHeader(req) {
  if (req.headers['x-requested-with'] !== 'dukan') throw new ApiError(403, 'Missing X-Requested-With header');
}

async function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const ttl = msFromExpiry(env.jwt.refreshExpiresIn);
  await refreshTokenModel.store(user.id, refreshToken, new Date(Date.now() + ttl));
  res.cookie(COOKIE_NAME, refreshToken, { ...cookieOptions(), maxAge: ttl });
  return accessToken;
}

async function sessionPayload(user) {
  const permissions = user.role_name === 'SUPER_ADMIN' ? '*' : await roleModel.getPermissions(user.role_id);
  return {
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role_name: user.role_name },
    permissions,
  };
}

const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  const user = await userModel.findByLogin(identifier);
  if (!user) {
    // Same work as a wrong password (a hash check plus one write that matches no row), so timing reveals nothing.
    await bcrypt.compare(password, DUMMY_HASH);
    await userModel.recordFailedLogin(0, env.maxFailedLogins, env.lockoutMinutes);
    throw new ApiError(401, 'Invalid credentials');
  }
  if (user.is_locked) {
    throw new ApiError(429, `Too many failed attempts. Try again in ${user.lock_minutes} minute(s).`);
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    await userModel.recordFailedLogin(user.id, env.maxFailedLogins, env.lockoutMinutes);
    throw new ApiError(401, 'Invalid credentials');
  }
  if (user.status !== 'active') throw new ApiError(401, 'Invalid credentials');

  await userModel.resetFailedLogins(user.id);
  const accessToken = await issueSession(res, user);
  ok(res, { accessToken, ...(await sessionPayload(user)) }, 'Login successful');
});

const refresh = asyncHandler(async (req, res) => {
  requireAjaxHeader(req);

  const token = readCookie(req, COOKIE_NAME);
  if (!token) throw new ApiError(401, 'Not signed in');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    res.clearCookie(COOKIE_NAME, cookieOptions());
    throw new ApiError(401, 'Session expired, please log in again');
  }

  if (!(await refreshTokenModel.isValid(payload.sub, token))) {
    // A token that was already used and is presented again later means it may have been stolen:
    // end every session of this user. Within a short grace window it is just two tabs racing.
    const age = await refreshTokenModel.revokedAgeSeconds(payload.sub, token);
    if (age !== null && age > REUSE_GRACE_SECONDS) {
      await refreshTokenModel.revokeAllForUser(payload.sub);
      console.warn(`[security] refresh token reuse detected for user ${payload.sub}; all sessions revoked`);
    }
    res.clearCookie(COOKIE_NAME, cookieOptions());
    throw new ApiError(401, 'Session expired, please log in again');
  }

  const user = await userModel.findById(payload.sub);
  if (!user || user.status !== 'active') {
    res.clearCookie(COOKIE_NAME, cookieOptions());
    throw new ApiError(401, 'Account is disabled');
  }

  await refreshTokenModel.revoke(user.id, token);
  const accessToken = await issueSession(res, user);
  ok(res, { accessToken, ...(await sessionPayload(user)) }, 'Session refreshed');
});

const logout = asyncHandler(async (req, res) => {
  requireAjaxHeader(req);

  const token = readCookie(req, COOKIE_NAME);
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await refreshTokenModel.revoke(payload.sub, token);
    } catch {
      // expired or malformed: nothing to revoke
    }
  }
  res.clearCookie(COOKIE_NAME, cookieOptions());
  ok(res, null, 'Logged out');
});

const me = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');
  const permissions = user.role_name === 'SUPER_ADMIN' ? '*' : await roleModel.getPermissions(user.role_id);
  ok(res, { ...user, permissions }, 'Current user');
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = :id', { id: req.user.id });
  if (!rows[0]) throw new ApiError(404, 'User not found');

  const passwordOk = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!passwordOk) throw new ApiError(401, 'Current password is incorrect');

  await userModel.updatePassword(req.user.id, await bcrypt.hash(newPassword, 12));
  await refreshTokenModel.revokeAllForUser(req.user.id);
  res.clearCookie(COOKIE_NAME, cookieOptions());

  ok(res, null, 'Password changed, please log in again');
});

module.exports = { login, refresh, logout, me, changePassword };
