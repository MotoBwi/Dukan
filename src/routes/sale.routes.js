const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParam } = require('../validators/common.validator');
const saleValidator = require('../validators/sale.validator');
const controller = require('../controllers/sale.controller');

router.use(authenticate);

router.get('/', authorize('sales', 'read'), validate({ query: saleValidator.list }), controller.list);
router.get('/:id', authorize('sales', 'read'), validate({ params: idParam }), controller.getOne);
router.post('/', authorize('sales', 'create'), validate({ body: saleValidator.create }), controller.create);
router.delete('/:id', authorize('sales', 'delete'), validate({ params: idParam }), controller.remove);

module.exports = router;
