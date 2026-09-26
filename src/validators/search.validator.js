const { z } = require('zod');

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional();

const SORTS = ['due_desc', 'due_asc', 'recent', 'name'];

const searchQuery = z.object({
  q: z.string().trim().max(100).optional().default(''),
  address: z.string().trim().max(100).optional().default(''),
  from: date,
  to: date,
  onlyDue: z.enum(['true', 'false']).optional().default('false').transform((v) => v === 'true'),
  sort: z.enum(SORTS).optional().default('due_desc'),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
});

module.exports = { searchQuery, SORTS };
