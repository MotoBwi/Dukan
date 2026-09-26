const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParam, pagination } = require('../validators/common.validator');
const userValidator = require('../validators/user.validator');
const controller = require('../controllers/user.controller');

router.use(authenticate);

router.get('/', authorize('users', 'read'), validate({ query: pagination }), controller.list);
router.get('/:id', authorize('users', 'read'), validate({ params: idParam }), controller.getOne);
router.post('/', authorize('users', 'create'), validate({ body: userValidator.create }), controller.create);
router.patch('/:id', authorize('users', 'update'), validate({ params: idParam, body: userValidator.update }), controller.update);
router.delete('/:id', authorize('users', 'delete'), validate({ params: idParam }), controller.remove);

module.exports = router;
