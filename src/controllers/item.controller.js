const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const itemModel = require('../models/item.model');
const audit = require('../middleware/audit.middleware');

const list = asyncHandler(async (req, res) => {
  ok(res, await itemModel.findAll(req.query));
});

const options = asyncHandler(async (req, res) => {
  ok(res, await itemModel.findAllOptions());
});

const stockLevels = asyncHandler(async (req, res) => {
  ok(res, await itemModel.getAllStockBalances());
});

const getOne = asyncHandler(async (req, res) => {
  const item = await itemModel.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Item not found');
  const balance = await itemModel.getStockBalance(req.params.id);
  ok(res, { ...item, stock_balance: balance });
});

const create = asyncHandler(async (req, res) => {
  const existing = await itemModel.findByName(req.body.name);
  if (existing) throw new ApiError(409, 'Item with this name already exists');
  const item = await itemModel.create(req.body);
  await audit(req, { module: 'items', action: 'create', recordId: item.id, after: item });
  created(res, item);
});

const update = asyncHandler(async (req, res) => {
  const before = await itemModel.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Item not found');
  const item = await itemModel.update(req.params.id, req.body);
  await audit(req, { module: 'items', action: 'update', recordId: item.id, before, after: item });
  ok(res, item);
});

const remove = asyncHandler(async (req, res) => {
  const before = await itemModel.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Item not found');
  await itemModel.softDelete(req.params.id);
  await audit(req, { module: 'items', action: 'delete', recordId: req.params.id, before });
  ok(res, null, 'Item deleted');
});

module.exports = { list, options, stockLevels, getOne, create, update, remove };
