const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParam, pagination } = require('../validators/common.validator');
const itemValidator = require('../validators/item.validator');
const controller = require('../controllers/item.controller');

router.use(authenticate);

router.get('/', authorize('items', 'read'), validate({ query: pagination }), controller.list);
router.get('/stock', authorize('items', 'read'), controller.stockLevels);
router.get('/options', authorize('items', 'read'), controller.options);
router.get('/:id', authorize('items', 'read'), validate({ params: idParam }), controller.getOne);
router.post('/', authorize('items', 'create'), validate({ body: itemValidator.create }), controller.create);
router.patch('/:id', authorize('items', 'update'), validate({ params: idParam, body: itemValidator.update }), controller.update);
router.delete('/:id', authorize('items', 'delete'), validate({ params: idParam }), controller.remove);

module.exports = router;
