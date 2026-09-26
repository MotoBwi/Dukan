const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const reportModel = require('../models/report.model');
const roleModel = require('../models/role.model');
const customerModel = require('../models/customer.model');

async function canReadRecovery(user) {
  if (user.role_name === 'SUPER_ADMIN') return true;
  const permissions = await roleModel.getPermissions(user.role_id);
  return permissions.some((p) => p.module === 'recovery' && p.action === 'read');
}

const customerSales = asyncHandler(async (req, res) => {
  ok(res, await reportModel.customerSalesSummary(req.query));
});

const customerSalesDetail = asyncHandler(async (req, res) => {
  const [sales, recoveryAllowed] = await Promise.all([
    reportModel.customerSalesDetail(req.params.id, req.query),
    canReadRecovery(req.user),
  ]);
  const recoveries = recoveryAllowed ? await reportModel.customerRecoveries(req.params.id, req.query) : null;
  ok(res, { sales, recoveries });
});

const customerLedger = asyncHandler(async (req, res) => {
  const customer = await customerModel.findById(req.params.id);
  if (!customer) throw new ApiError(404, 'Customer not found');
  ok(res, { customer, ...(await reportModel.customerLedger(req.params.id, req.query)) });
});

module.exports = { customerSales, customerSalesDetail, customerLedger };
