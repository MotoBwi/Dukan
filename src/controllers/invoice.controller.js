const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const invoiceModel = require('../models/invoice.model');
const shop = require('../config/shop');

const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await invoiceModel.getByBill(req.params.billId);
  if (!invoice) throw new ApiError(404, `No invoice found for bill number ${req.params.billId}`);
  ok(res, { shop, ...invoice });
});

module.exports = { getInvoice };
