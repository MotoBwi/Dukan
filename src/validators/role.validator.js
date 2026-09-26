const { z } = require('zod');

const create = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(255).optional(),
});

const setPermissions = z.object({
  permissionIds: z.array(z.coerce.number().int().positive()),
});

module.exports = { create, setPermissions };
