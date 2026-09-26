const router = require('express').Router();
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParam } = require('../validators/common.validator');
const reminderValidator = require('../validators/reminder.validator');
const controller = require('../controllers/reminder.controller');

// Reminders send real email, so cap how many one user can create (protects the mail server from abuse).
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => `user:${req.user.id}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, data: null, message: 'Too many reminders created, please try again later.', errors: null },
});

const list = z.object({
  status: z.enum(['pending', 'done', 'snoozed']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

router.use(authenticate);

router.get('/', authorize('reminders', 'read'), validate({ query: list }), controller.list);
router.post(
  '/',
  authorize('reminders', 'create'),
  createLimiter,
  validate({ body: reminderValidator.create }),
  controller.create
);
router.patch(
  '/:id/status',
  authorize('reminders', 'update'),
  validate({ params: idParam, body: reminderValidator.updateStatus }),
  controller.updateStatus
);
router.delete('/:id', authorize('reminders', 'delete'), validate({ params: idParam }), controller.remove);

module.exports = router;
