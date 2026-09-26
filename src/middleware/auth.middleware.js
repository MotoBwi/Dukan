const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/jwt');

/**
 * Verifies the access token, then loads the user's CURRENT status and role from the database,
 * so a disabled account or a changed role takes effect on the very next request.
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Missing or invalid Authorization header'));
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new ApiError(401, 'Invalid or expired access token'));
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.status, u.role_id, r.name AS role_name
         FROM users u JOIN roles r ON r.id = u.role_id
        WHERE u.id = :id`,
      { id: payload.sub }
    );
    const user = rows[0];
    if (!user || user.status !== 'active') {
      return next(new ApiError(401, 'Account is disabled or no longer exists'));
    }
    req.user = { id: user.id, role_id: user.role_id, role_name: user.role_name };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;
