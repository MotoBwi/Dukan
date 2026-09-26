const router = require('express').Router();
const { z } = require('zod');
const authenticate = require('../middleware/auth.middleware');
const requireSuperAdmin = require('../middleware/superAdmin.middleware');
const validate = require('../middleware/validate.middleware');
const controller = require('../controllers/revenue.controller');

const monthlyQuery = z.object({ year: z.coerce.number().int().min(2000).max(2100).optional() });

// Profit and purchase figures are for the owner only: gated on the Super Admin role itself,
// not on the permission matrix, so no custom role can ever be granted access by accident.
router.use(authenticate, requireSuperAdmin);

router.get('/summary', controller.summary);
router.get('/monthly', validate({ query: monthlyQuery }), controller.monthly);
router.get('/yearly', controller.yearly);

module.exports = router;
