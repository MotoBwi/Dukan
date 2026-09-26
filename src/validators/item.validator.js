const { z } = require('zod');
const { UNITS } = require('./common.validator');

const create = z.object({
  name: z.string().min(1).max(100),
  defaultUnit: z.enum(UNITS).optional(),
});

const update = create.partial();

module.exports = { create, update };
