const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const requireSuperAdmin = require('../middleware/superAdmin.middleware');
const validate = require('../middleware/validate.middleware');
const { idParam } = require('../validators/common.validator');
const recoveryValidator = require('../validators/recovery.validator');
const controller = require('../controllers/recovery.controller');

router.use(authenticate);

router.get('/', authorize('recovery', 'read'), validate({ query: recoveryValidator.list }), controller.list);
router.post('/', authorize('recovery', 'create'), validate({ body: recoveryValidator.create }), controller.create);
router.patch(
  '/:id',
  requireSuperAdmin,
  validate({ params: idParam, body: recoveryValidator.update }),
  controller.update
);

module.exports = router;
