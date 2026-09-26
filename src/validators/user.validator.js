const { z } = require('zod');
const { password } = require('./common.validator');

// Forms send '' or null for fields left empty; treat both as "not provided".
const emptyToUndefined = (v) => (v === '' || v === null ? undefined : v);

const username = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(50)
    .regex(/^[A-Za-z0-9._-]+$/, 'Username can only contain letters, numbers, dot, dash and underscore')
    .optional()
);
const email = z.preprocess(emptyToUndefined, z.string().trim().email().max(150).optional());

const create = z.object({
  name: z.string().min(2).max(100),
  username,
  email,
  phone: z.string().min(6).max(20),
  password,
  roleId: z.coerce.number().int().positive(),
});

const update = z.object({
  name: z.string().min(2).max(100).optional(),
  username,
  email,
  phone: z.string().min(6).max(20).optional(),
  roleId: z.coerce.number().int().positive().optional(),
  status: z.enum(['active', 'disabled']).optional(),
});

module.exports = { create, update };
