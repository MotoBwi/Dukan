const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParam, pagination } = require('../validators/common.validator');
const customerValidator = require('../validators/customer.validator');
const controller = require('../controllers/customer.controller');

router.use(authenticate);

router.get('/', authorize('customers', 'read'), validate({ query: pagination }), controller.list);
router.get('/:id', authorize('customers', 'read'), validate({ params: idParam }), controller.getOne);
router.post('/', authorize('customers', 'create'), validate({ body: customerValidator.create }), controller.create);
router.patch('/:id', authorize('customers', 'update'), validate({ params: idParam, body: customerValidator.update }), controller.update);
router.delete('/:id', authorize('customers', 'delete'), validate({ params: idParam }), controller.remove);

module.exports = router;
