const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const customerModel = require('../models/customer.model');
const audit = require('../middleware/audit.middleware');

const list = asyncHandler(async (req, res) => {
  ok(res, await customerModel.findAll(req.query));
});

const getOne = asyncHandler(async (req, res) => {
  const customer = await customerModel.findById(req.params.id);
  if (!customer) throw new ApiError(404, 'Customer not found');
  const dueBalance = await customerModel.getDueBalance(req.params.id);
  ok(res, { ...customer, due_balance: dueBalance });
});

const create = asyncHandler(async (req, res) => {
  const customer = await customerModel.create({ ...req.body, createdBy: req.user.id });
  await audit(req, { module: 'customers', action: 'create', recordId: customer.id, after: customer });
  created(res, customer);
});

const update = asyncHandler(async (req, res) => {
  const before = await customerModel.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Customer not found');
  const customer = await customerModel.update(req.params.id, req.body);
  await audit(req, { module: 'customers', action: 'update', recordId: customer.id, before, after: customer });
  ok(res, customer);
});

const remove = asyncHandler(async (req, res) => {
  const before = await customerModel.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Customer not found');
  await customerModel.softDelete(req.params.id);
  await audit(req, { module: 'customers', action: 'delete', recordId: req.params.id, before });
  ok(res, null, 'Customer deleted');
});

module.exports = { list, getOne, create, update, remove };
