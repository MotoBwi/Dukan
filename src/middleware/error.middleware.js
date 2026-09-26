const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

const BODY_PARSER_MESSAGES = {
  'entity.parse.failed': 'Invalid JSON body',
  'entity.too.large': 'Request body is too large',
};

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err instanceof ApiError ? err.status : err.status || err.statusCode || 500;
  let message;
  let errors = err.errors || null;

  if (err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'A record with the same value already exists';
    errors = null;
  } else if (err instanceof ApiError) {
    message = err.message;
  } else if (status < 500) {
    message = BODY_PARSER_MESSAGES[err.type] || 'Bad request';
    errors = null;
  } else {
    // Unknown failures (SQL errors, bugs): log the details here, never send them to the client.
    status = 500;
    message = 'Internal server error';
    errors = null;
  }

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ success: false, data: null, message, errors });
}

module.exports = { notFound, errorHandler };
