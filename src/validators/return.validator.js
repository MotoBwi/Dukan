const { z } = require('zod');

const create = z.object({
  saleId: z.coerce.number().int().positive(),
  qty: z.coerce.number().positive().optional(), // defaults to full sale qty if omitted
  price: z.coerce.number().positive().optional(),
  returnDate: z.string().min(10).max(10),
  reason: z.string().max(255).optional(),
});

module.exports = { create };
