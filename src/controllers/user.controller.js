const bcrypt = require('bcrypt');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const userModel = require('../models/user.model');
const roleModel = require('../models/role.model');
const refreshTokenModel = require('../models/refreshToken.model');
const audit = require('../middleware/audit.middleware');

const isSuperAdmin = (req) => req.user.role_name === 'SUPER_ADMIN';

async function assertCanAssignRole(req, roleId) {
  const role = await roleModel.findById(roleId);
  if (!role) throw new ApiError(400, 'Role not found');
  if (role.name === 'SUPER_ADMIN' && !isSuperAdmin(req)) {
    throw new ApiError(403, 'Only a Super Admin can assign the Super Admin role');
  }
}

function assertCanTouch(req, target) {
  if (target.role_name === 'SUPER_ADMIN' && !isSuperAdmin(req)) {
    throw new ApiError(403, 'Only a Super Admin can modify a Super Admin');
  }
}

// Username, phone and email are all accepted as a login ID, so none of them may equal another account's ID.
async function assertLoginIdsFree(ownId, { username, email, phone }) {
  for (const value of [username, email, phone].filter(Boolean)) {
    const clash = await userModel.findByLogin(value);
    if (clash && clash.id !== ownId) throw new ApiError(409, 'That username, phone or email is already used by another account');
  }
}

async function assertNotLastSuperAdmin(target) {
  if (target.role_name !== 'SUPER_ADMIN' || target.status !== 'active') return;
  if ((await userModel.countActiveSuperAdmins()) <= 1) {
    throw new ApiError(400, 'Cannot disable or demote the last active Super Admin');
  }
}

const list = asyncHandler(async (req, res) => {
  ok(res, await userModel.findAll(req.query));
});

const getOne = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  ok(res, user);
});

const create = asyncHandler(async (req, res) => {
  const { name, username, email, phone, password, roleId } = req.body;
  await assertCanAssignRole(req, roleId);
  await assertLoginIdsFree(null, { username, email, phone });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await userModel.create({ name, username, email, phone, passwordHash, roleId });
  await audit(req, { module: 'users', action: 'create', recordId: user.id, after: user });
  created(res, user);
});

const update = asyncHandler(async (req, res) => {
  const before = await userModel.findById(req.params.id);
  if (!before) throw new ApiError(404, 'User not found');
  assertCanTouch(req, before);

  const { roleId, status } = req.body;
  if (roleId !== undefined) await assertCanAssignRole(req, roleId);
  await assertLoginIdsFree(before.id, req.body);

  const disabling = status === 'disabled' && before.status === 'active';
  const demoting = roleId !== undefined && roleId !== before.role_id;
  if (disabling && Number(before.id) === Number(req.user.id)) {
    throw new ApiError(400, 'You cannot disable your own account');
  }
  if (disabling || demoting) await assertNotLastSuperAdmin(before);

  const user = await userModel.update(req.params.id, req.body);
  if (disabling) await refreshTokenModel.revokeAllForUser(before.id);
  await audit(req, { module: 'users', action: 'update', recordId: user.id, before, after: user });
  ok(res, user);
});

const remove = asyncHandler(async (req, res) => {
  const before = await userModel.findById(req.params.id);
  if (!before) throw new ApiError(404, 'User not found');
  assertCanTouch(req, before);
  if (Number(before.id) === Number(req.user.id)) throw new ApiError(400, 'You cannot disable your own account');
  await assertNotLastSuperAdmin(before);

  await userModel.remove(req.params.id);
  await refreshTokenModel.revokeAllForUser(before.id);
  await audit(req, { module: 'users', action: 'delete', recordId: req.params.id, before });
  ok(res, null, 'User disabled');
});

module.exports = { list, getOne, create, update, remove };
