const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParam, pagination } = require('../validators/common.validator');
const returnValidator = require('../validators/return.validator');
const controller = require('../controllers/return.controller');

router.use(authenticate);

router.get('/', authorize('returns', 'read'), validate({ query: pagination }), controller.list);
router.get('/:id', authorize('returns', 'read'), validate({ params: idParam }), controller.getOne);
router.post('/', authorize('returns', 'create'), validate({ body: returnValidator.create }), controller.create);
router.delete('/:id', authorize('returns', 'delete'), validate({ params: idParam }), controller.remove);

module.exports = router;
