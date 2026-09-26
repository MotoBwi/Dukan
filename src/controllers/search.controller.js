const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const searchModel = require('../models/search.model');

const search = asyncHandler(async (req, res) => {
  ok(res, await searchModel.searchCustomers(req.query));
});

module.exports = { search };
