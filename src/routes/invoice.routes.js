const router = require('express').Router();
const { z } = require('zod');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const controller = require('../controllers/invoice.controller');

const billParam = z.object({ billId: z.coerce.number().int().positive() });

router.use(authenticate);
router.get('/:billId', authorize('sales', 'read'), validate({ params: billParam }), controller.getInvoice);

module.exports = router;
