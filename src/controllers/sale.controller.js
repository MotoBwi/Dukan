const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const saleModel = require('../models/sale.model');
const itemModel = require('../models/item.model');
const customerModel = require('../models/customer.model');
const audit = require('../middleware/audit.middleware');

const list = asyncHandler(async (req, res) => {
  ok(res, await saleModel.findAll(req.query));
});

const getOne = asyncHandler(async (req, res) => {
  const sale = await saleModel.findById(req.params.id);
  if (!sale) throw new ApiError(404, 'Sale not found');
  ok(res, sale);
});

const create = asyncHandler(async (req, res) => {
  const { customerId, saleDate, note, paidAmount, items } = req.body;

  const customer = await customerModel.findById(customerId);
  if (!customer) throw new ApiError(404, 'Customer not found');

  const lines = [];
  for (const line of items) {
    const item = await itemModel.findOrCreateByName(line.itemName, line.unit);
    lines.push({ ...line, itemId: item.id, itemName: item.name });
  }

  const sales = await saleModel.createBill({
    customerId,
    saleDate,
    note,
    paidAmount,
    lines,
    createdBy: req.user.id,
  });

  await audit(req, { module: 'sales', action: 'create', recordId: sales[0].id, after: sales });
  created(res, sales);
});

const remove = asyncHandler(async (req, res) => {
  const before = await saleModel.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Sale not found');
  await saleModel.softDelete(req.params.id);
  await audit(req, { module: 'sales', action: 'delete', recordId: req.params.id, before });
  ok(res, null, 'Sale deleted, stock reversed');
});

module.exports = { list, getOne, create, remove };
