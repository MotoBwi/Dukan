const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const recoveryModel = require('../models/recovery.model');
const customerModel = require('../models/customer.model');
const audit = require('../middleware/audit.middleware');

const list = asyncHandler(async (req, res) => {
  ok(res, await recoveryModel.findAll(req.query));
});

const create = asyncHandler(async (req, res) => {
  const customer = await customerModel.findById(req.body.customerId);
  if (!customer) throw new ApiError(404, 'Customer not found');

  const payment = await recoveryModel.create({ ...req.body, createdBy: req.user.id });
  await audit(req, { module: 'recovery', action: 'create', recordId: payment.id, after: payment });
  created(res, payment);
});

const update = asyncHandler(async (req, res) => {
  const before = await recoveryModel.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Recovery entry not found');

  const payment = await recoveryModel.update(req.params.id, req.body);
  await audit(req, { module: 'recovery', action: 'update', recordId: payment.id, before, after: payment });
  ok(res, payment, 'Recovery updated and dues re-balanced');
});

module.exports = { list, create, update };
