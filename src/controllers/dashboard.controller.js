const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const dashboardModel = require('../models/dashboard.model');

const summary = asyncHandler(async (req, res) => {
  ok(res, await dashboardModel.getSummary());
});

module.exports = { summary };
