const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const searchValidator = require('../validators/search.validator');
const controller = require('../controllers/search.controller');

router.use(authenticate);
router.get(
  '/',
  authorize('customers', 'read'),
  authorize('sales', 'read'),
  validate({ query: searchValidator.searchQuery }),
  controller.search
);

module.exports = router;
