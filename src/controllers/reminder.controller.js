const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const reminderModel = require('../models/reminder.model');
const audit = require('../middleware/audit.middleware');

const list = asyncHandler(async (req, res) => {
  ok(res, await reminderModel.findAll(req.query));
});

const create = asyncHandler(async (req, res) => {
  const reminder = await reminderModel.create({ ...req.body, createdBy: req.user.id });
  await audit(req, { module: 'reminders', action: 'create', recordId: reminder.id, after: reminder });
  created(res, reminder);
});

const updateStatus = asyncHandler(async (req, res) => {
  const before = await reminderModel.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Reminder not found');
  const reminder = await reminderModel.updateStatus(req.params.id, req.body.status);
  await audit(req, { module: 'reminders', action: 'update', recordId: reminder.id, before, after: reminder });
  ok(res, reminder);
});

const remove = asyncHandler(async (req, res) => {
  const before = await reminderModel.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Reminder not found');
  await reminderModel.remove(req.params.id);
  await audit(req, { module: 'reminders', action: 'delete', recordId: req.params.id, before });
  ok(res, null, 'Reminder deleted');
});

module.exports = { list, create, updateStatus, remove };
