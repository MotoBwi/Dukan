const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const purchaseModel = require('../models/purchase.model');
const itemModel = require('../models/item.model');
const audit = require('../middleware/audit.middleware');

const list = asyncHandler(async (req, res) => {
  ok(res, await purchaseModel.findAll(req.query));
});

const getOne = asyncHandler(async (req, res) => {
  const purchase = await purchaseModel.findById(req.params.id);
  if (!purchase) throw new ApiError(404, 'Purchase not found');
  ok(res, purchase);
});

const create = asyncHandler(async (req, res) => {
  const { itemName, unit, wheels, qty, price, purchaseDate, note } = req.body;
  const item = await itemModel.findOrCreateByName(itemName, unit);

  const purchase = await purchaseModel.create({
    itemId: item.id,
    itemName,
    unit,
    wheels,
    qty,
    price,
    purchaseDate,
    note,
    createdBy: req.user.id,
  });

  await audit(req, { module: 'purchases', action: 'create', recordId: purchase.id, after: purchase });
  created(res, purchase);
});

const remove = asyncHandler(async (req, res) => {
  const before = await purchaseModel.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Purchase not found');
  await purchaseModel.softDelete(req.params.id);
  await audit(req, { module: 'purchases', action: 'delete', recordId: req.params.id, before });
  ok(res, null, 'Purchase deleted, stock reversed');
});

module.exports = { list, getOne, create, remove };
