const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const roleModel = require('../models/role.model');
const permissionModel = require('../models/permission.model');
const audit = require('../middleware/audit.middleware');

const list = asyncHandler(async (req, res) => {
  ok(res, await roleModel.findAll());
});

const listPermissions = asyncHandler(async (req, res) => {
  ok(res, await permissionModel.findAll());
});

const getOne = asyncHandler(async (req, res) => {
  const role = await roleModel.findById(req.params.id);
  if (!role) throw new ApiError(404, 'Role not found');
  const permissions = await roleModel.getPermissions(req.params.id);
  ok(res, { ...role, permissions });
});

const create = asyncHandler(async (req, res) => {
  const role = await roleModel.create(req.body);
  await audit(req, { module: 'roles', action: 'create', recordId: role.id, after: role });
  created(res, role);
});

const setPermissions = asyncHandler(async (req, res) => {
  const role = await roleModel.findById(req.params.id);
  if (!role) throw new ApiError(404, 'Role not found');

  const before = await roleModel.getPermissions(req.params.id);
  await roleModel.setPermissions(req.params.id, req.body.permissionIds);
  const after = await roleModel.getPermissions(req.params.id);

  await audit(req, { module: 'roles', action: 'update', recordId: role.id, before, after });
  ok(res, { ...role, permissions: after }, 'Permissions updated');
});

module.exports = { list, listPermissions, getOne, create, setPermissions };
