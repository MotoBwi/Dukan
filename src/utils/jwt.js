const jwt = require('jsonwebtoken');
const env = require('../config/env');

const ALGORITHM = 'HS256';

function signAccessToken(user) {
  return jwt.sign({ sub: user.id }, env.jwt.accessSecret, {
    algorithm: ALGORITHM,
    expiresIn: env.jwt.accessExpiresIn,
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, env.jwt.refreshSecret, {
    algorithm: ALGORITHM,
    expiresIn: env.jwt.refreshExpiresIn,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret, { algorithms: [ALGORITHM] });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret, { algorithms: [ALGORITHM] });
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
