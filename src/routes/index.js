const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/roles', require('./role.routes'));
router.use('/customers', require('./customer.routes'));
router.use('/items', require('./item.routes'));
router.use('/purchases', require('./purchase.routes'));
router.use('/sales', require('./sale.routes'));
router.use('/returns', require('./return.routes'));
router.use('/recovery', require('./recovery.routes'));
router.use('/reminders', require('./reminder.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/reports', require('./report.routes'));
router.use('/invoices', require('./invoice.routes'));
router.use('/search', require('./search.routes'));
router.use('/revenue', require('./revenue.routes'));

module.exports = router;
