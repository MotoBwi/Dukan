const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const returnModel = require('../models/return.model');
const audit = require('../middleware/audit.middleware');

const list = asyncHandler(async (req, res) => {
  ok(res, await returnModel.findAll(req.query));
});

const getOne = asyncHandler(async (req, res) => {
  const record = await returnModel.findById(req.params.id);
  if (!record) throw new ApiError(404, 'Return not found');
  ok(res, record);
});

const create = asyncHandler(async (req, res) => {
  const record = await returnModel.create({ ...req.body, createdBy: req.user.id });
  await audit(req, { module: 'returns', action: 'create', recordId: record.id, after: record });
  created(res, record);
});

const remove = asyncHandler(async (req, res) => {
  const before = await returnModel.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Return not found');
  await returnModel.softDelete(req.params.id);
  await audit(req, { module: 'returns', action: 'delete', recordId: req.params.id, before });
  ok(res, null, 'Return deleted, stock and dues reversed');
});

module.exports = { list, getOne, create, remove };
