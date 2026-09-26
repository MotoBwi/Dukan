const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const controller = require('../controllers/dashboard.controller');

router.use(authenticate);
router.get('/summary', authorize('dashboard', 'read'), controller.summary);

module.exports = router;
