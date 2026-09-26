const { z } = require('zod');

const emptyToUndefined = (v) => (v === '' || v === null ? undefined : v);

const create = z.object({
  customerId: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  saleId: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  title: z.string().trim().min(1).max(150),
  email: z.string().trim().email('Enter a valid email address').max(150),
  note: z.string().max(255).optional(),
  remindAt: z.string().min(10), // ISO datetime, e.g. 2026-09-26T18:30
});

const updateStatus = z.object({
  status: z.enum(['pending', 'done', 'snoozed']),
});

module.exports = { create, updateStatus };
