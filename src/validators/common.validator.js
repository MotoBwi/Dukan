const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });

const pagination = z.object({
  search: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const UNITS = ['KG', 'PCS', 'GARI_BY_WHEEL', 'TROLLY', 'TIN', 'NUMBER'];

// bcrypt only looks at the first 72 bytes, so longer passwords are rejected rather than silently truncated.
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password can be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

module.exports = { idParam, pagination, UNITS, password };
