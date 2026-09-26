const { z } = require('zod');

const PAYMENT_MODES = ['UPI', 'CASH', 'BANK'];

const create = z.object({
  customerId: z.coerce.number().int().positive(),
  saleId: z.coerce.number().int().positive().optional(),
  amount: z.coerce.number().positive(),
  paymentMode: z.enum(PAYMENT_MODES),
  collectedBy: z.string().trim().min(1).max(100),
  paymentDate: z.string().min(10).max(10),
  note: z.string().max(255).optional(),
});

const emptyToUndefined = (v) => (v === '' || v === null ? undefined : v);

const update = z.object({
  amount: z.coerce.number().positive().optional(),
  paymentMode: z.enum(PAYMENT_MODES).optional(),
  collectedBy: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(100).optional()),
  paymentDate: z.string().min(10).max(10).optional(),
  note: z.string().max(255).optional(),
});

const list = z.object({
  customerId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

module.exports = { create, update, list };
