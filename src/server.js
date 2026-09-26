const app = require('./app');
const env = require('./config/env');
const scheduler = require('./scheduler/reminder.scheduler');

app.listen(env.port, () => {
  console.log(`Dukan API listening on port ${env.port} [${env.nodeEnv}]`);
  scheduler.start();
});
