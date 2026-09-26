const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

if (env.trustProxy) app.set('trust proxy', env.trustProxy);

app.use(helmet());
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false });
app.use('/api/v1', apiLimiter, apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
