function ok(res, data, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

function created(res, data, message = 'Created') {
  return ok(res, data, message, 201);
}

function fail(res, message, status = 400, errors = null) {
  return res.status(status).json({ success: false, data: null, message, errors });
}

module.exports = { ok, created, fail };
