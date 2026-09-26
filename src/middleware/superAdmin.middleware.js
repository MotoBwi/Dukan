const ApiError = require('../utils/ApiError');

function requireSuperAdmin(req, res, next) {
  if (req.user?.role_name !== 'SUPER_ADMIN') {
    return next(new ApiError(403, 'Only a Super Admin can do this'));
  }
  next();
}

module.exports = requireSuperAdmin;
