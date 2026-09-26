const ApiError = require('../utils/ApiError');

/**
 * validate({ body, params, query }) — each is an optional zod schema.
 * Replaces req.body/params/query with the parsed (and coerced) result.
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      next();
    } catch (err) {
      next(new ApiError(422, 'Validation failed', err.errors || err.message));
    }
  };
}

module.exports = validate;
