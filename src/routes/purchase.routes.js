const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParam, pagination } = require('../validators/common.validator');
const purchaseValidator = require('../validators/purchase.validator');
const controller = require('../controllers/purchase.controller');

router.use(authenticate);

router.get('/', authorize('purchases', 'read'), validate({ query: pagination }), controller.list);
router.get('/:id', authorize('purchases', 'read'), validate({ params: idParam }), controller.getOne);
router.post('/', authorize('purchases', 'create'), validate({ body: purchaseValidator.create }), controller.create);
router.delete('/:id', authorize('purchases', 'delete'), validate({ params: idParam }), controller.remove);

module.exports = router;
