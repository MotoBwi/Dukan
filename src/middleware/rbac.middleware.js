const pool = require('../config/db');
const ApiError = require('../utils/ApiError');

/**
 * authorize('customers', 'create') checks role_permissions for req.user.role_id.
 * SUPER_ADMIN role name always passes (belt-and-suspenders on top of the seeded matrix).
 */
function authorize(module, action) {
  return async (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Not authenticated'));

    if (req.user.role_name === 'SUPER_ADMIN') return next();

    try {
      const [rows] = await pool.query(
        `SELECT 1
           FROM role_permissions rp
           JOIN permissions p ON p.id = rp.permission_id
          WHERE rp.role_id = :roleId AND p.module = :module AND p.action = :action
          LIMIT 1`,
        { roleId: req.user.role_id, module, action }
      );

      if (rows.length === 0) {
        return next(new ApiError(403, `Forbidden: missing ${module}:${action} permission`));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = authorize;
