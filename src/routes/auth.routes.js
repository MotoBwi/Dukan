const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const authValidator = require('../validators/auth.validator');
const controller = require('../controllers/auth.controller');

const tooMany = { success: false, data: null, message: 'Too many attempts, please try again later.', errors: null };

// Only failed logins count towards this limit; the per-account lockout adds a second layer.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
});

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => `user:${req.user.id}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
});

router.post('/login', loginLimiter, validate({ body: authValidator.login }), controller.login);
router.post('/refresh', refreshLimiter, controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.me);
router.post(
  '/change-password',
  authenticate,
  changePasswordLimiter,
  validate({ body: authValidator.changePassword }),
  controller.changePassword
);

module.exports = router;
