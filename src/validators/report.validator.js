const { z } = require('zod');

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional();
const id = z.coerce.number().int().positive().optional();

const customerSalesDetailQuery = z.object({ from: date, to: date, itemId: id, userId: id });

const customerSalesQuery = customerSalesDetailQuery.extend({
  search: z.string().trim().max(100).optional().default(''),
});

const ledgerQuery = z.object({ from: date, to: date });

module.exports = { customerSalesQuery, customerSalesDetailQuery, ledgerQuery };
