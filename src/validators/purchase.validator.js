const { z } = require('zod');
const { UNITS } = require('./common.validator');

const emptyToUndefined = (v) => (v === '' || v === null ? undefined : v);

const create = z
  .object({
    itemName: z.string().min(1).max(100),
    unit: z.enum(UNITS),
    wheels: z.preprocess(emptyToUndefined, z.coerce.number().int().min(2).max(30).optional()),
    qty: z.coerce.number().positive(),
    price: z.coerce.number().positive(),
    purchaseDate: z.string().min(10).max(10), // YYYY-MM-DD
    note: z.string().max(255).optional(),
  })
  .refine((d) => d.unit !== 'GARI_BY_WHEEL' || d.wheels !== undefined, {
    message: 'Wheels is required for GARI BY WHEEL',
    path: ['wheels'],
  })
  .transform((d) => ({ ...d, wheels: d.unit === 'GARI_BY_WHEEL' ? d.wheels : undefined }));

module.exports = { create };
