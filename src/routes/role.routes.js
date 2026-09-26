const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const requireSuperAdmin = require('../middleware/superAdmin.middleware');
const validate = require('../middleware/validate.middleware');
const { idParam } = require('../validators/common.validator');
const roleValidator = require('../validators/role.validator');
const controller = require('../controllers/role.controller');

router.use(authenticate);

router.get('/', authorize('roles', 'read'), controller.list);
router.get('/permissions', authorize('roles', 'read'), controller.listPermissions);
router.get('/:id', authorize('roles', 'read'), validate({ params: idParam }), controller.getOne);
router.post('/', requireSuperAdmin, validate({ body: roleValidator.create }), controller.create);
router.put(
  '/:id/permissions',
  requireSuperAdmin,
  validate({ params: idParam, body: roleValidator.setPermissions }),
  controller.setPermissions
);

module.exports = router;
