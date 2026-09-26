const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParam } = require('../validators/common.validator');
const reportValidator = require('../validators/report.validator');
const controller = require('../controllers/report.controller');

router.use(authenticate);

router.get(
  '/customer-sales',
  authorize('sales', 'read'),
  validate({ query: reportValidator.customerSalesQuery }),
  controller.customerSales
);
router.get(
  '/customer-sales/:id',
  authorize('sales', 'read'),
  validate({ params: idParam, query: reportValidator.customerSalesDetailQuery }),
  controller.customerSalesDetail
);

router.get(
  '/customer-ledger/:id',
  authorize('customers', 'read'),
  authorize('sales', 'read'),
  authorize('returns', 'read'),
  authorize('recovery', 'read'),
  validate({ params: idParam, query: reportValidator.ledgerQuery }),
  controller.customerLedger
);

module.exports = router;
