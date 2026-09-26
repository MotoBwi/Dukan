const { z } = require('zod');

const SALE_UNITS = ['KG', 'PCS', 'TROLLY', 'TIN', 'NUMBER'];

const line = z.object({
  itemName: z.string().trim().min(1).max(100),
  unit: z.enum(SALE_UNITS),
  qty: z.coerce.number().positive(),
  price: z.coerce.number().positive(),
});

const paise = (n) => Math.round(n * 100);

const create = z
  .object({
    customerId: z.coerce.number().int().positive(),
    saleDate: z.string().min(10).max(10),
    paidAmount: z.coerce.number().min(0).optional(),
    note: z.string().max(255).optional(),
    items: z.array(line).min(1).max(50),
  })
  .refine(
    (d) =>
      d.paidAmount === undefined ||
      paise(d.paidAmount) <= d.items.reduce((sum, i) => sum + paise(i.qty * i.price), 0),
    { message: 'Paid amount cannot be more than the bill total', path: ['paidAmount'] }
  );

const list = z.object({
  customerId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

module.exports = { create, list, SALE_UNITS };
