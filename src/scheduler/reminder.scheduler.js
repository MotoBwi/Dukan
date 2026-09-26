const cron = require('node-cron');
const reminderModel = require('../models/reminder.model');
const mail = require('../services/mail.service');

const RETRY_AFTER_MS = 10 * 60 * 1000;
const MAX_EMAILS_PER_HOUR = Number(process.env.MAX_EMAILS_PER_HOUR || 60);
const sentTimes = [];
const lastAttempt = new Map();
let running = false;
let warnedNotConfigured = false;

/** Emails every due reminder once. Failures stay pending and are retried after a pause. */
async function runOnce() {
  if (running) return;
  running = true;
  try {
    const due = await reminderModel.findDue();
    if (due.length === 0) return;

    if (!mail.isConfigured()) {
      if (!warnedNotConfigured) {
        console.warn(`[reminder] ${due.length} reminder(s) are due but SMTP is not configured — set SMTP_* in .env. Nothing was sent.`);
        warnedNotConfigured = true;
      }
      return;
    }
    warnedNotConfigured = false;

    for (const reminder of due) {
      const cutoff = Date.now() - 60 * 60 * 1000;
      while (sentTimes.length && sentTimes[0] < cutoff) sentTimes.shift();
      if (sentTimes.length >= MAX_EMAILS_PER_HOUR) {
        console.warn('[reminder] hourly email limit reached; the remaining reminders wait for the next hour');
        break;
      }

      const last = lastAttempt.get(reminder.id);
      if (last && Date.now() - last < RETRY_AFTER_MS) continue;
      lastAttempt.set(reminder.id, Date.now());

      try {
        const customer = reminder.customer_id ? await reminderModel.getCustomerContext(reminder.customer_id) : null;
        const { sentCopyError } = await mail.sendReminderEmail({ reminder, customer });
        await reminderModel.markSent(reminder.id, sentCopyError);
        sentTimes.push(Date.now());
        lastAttempt.delete(reminder.id);
        console.log(`[reminder] sent #${reminder.id} "${reminder.title}" to ${reminder.email}`);
        if (sentCopyError) console.warn(`[reminder] #${reminder.id}: ${sentCopyError}`);
      } catch (err) {
        await reminderModel.markFailed(reminder.id, err.message);
        console.error(`[reminder] failed #${reminder.id}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('reminder scheduler failed:', err.message);
  } finally {
    running = false;
  }
}

function start() {
  cron.schedule('* * * * *', runOnce);
}

module.exports = { start, runOnce };
