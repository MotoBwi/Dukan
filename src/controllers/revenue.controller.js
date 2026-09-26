const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const revenueModel = require('../models/revenue.model');

const summary = asyncHandler(async (req, res) => {
  ok(res, { totals: await revenueModel.summary() });
});

const monthly = asyncHandler(async (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const [report, years] = await Promise.all([revenueModel.monthly(year), revenueModel.activeYears()]);
  ok(res, { ...report, years: years.includes(year) ? years : [year, ...years].sort((a, b) => b - a) });
});

const yearly = asyncHandler(async (req, res) => {
  ok(res, await revenueModel.yearly());
});

module.exports = { summary, monthly, yearly };
