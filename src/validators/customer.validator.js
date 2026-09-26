const { z } = require('zod');

const create = z.object({
  name: z.string().min(2).max(100),
  age: z.coerce.number().int().min(0).max(150).optional(),
  phone: z.string().min(6).max(20),
  address: z.string().max(255).optional(),
});

const update = create.partial();

module.exports = { create, update };
