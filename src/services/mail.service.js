require('../config/env');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const MailComposer = require('nodemailer/lib/mail-composer');
const { ImapFlow } = require('imapflow');

let transporter = null;

const smtpPass = () => process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

/** SMTP counts as configured only when a real host and credentials are set (the example host is a placeholder). */
function isConfigured() {
  const { SMTP_HOST, SMTP_USER } = process.env;
  return Boolean(SMTP_HOST && SMTP_HOST !== 'smtp.example.com' && SMTP_USER && smtpPass());
}

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: { user: process.env.SMTP_USER, pass: smtpPass() },
    });
  }
  return transporter;
}

const inr = (v) => `Rs. ${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function buildReminderMessage({ reminder, customer }) {
  const lines = [reminder.title];
  if (reminder.note) lines.push('', reminder.note);
  if (customer) {
    lines.push('', `Customer: ${customer.name} (${customer.phone})`, `Total due: ${inr(customer.total_due)}`);
  }
  lines.push('', `Reminder set for: ${String(reminder.remind_at).replace('T', ' ')}`);

  return {
    from: process.env.SMTP_FROM || `Dukan <${process.env.SMTP_USER}>`,
    to: reminder.email,
    subject: `Reminder: ${reminder.title}`,
    text: lines.join('\n'),
  };
}

function buildRaw(message) {
  return new Promise((resolve, reject) => {
    new MailComposer(message).compile().build((err, raw) => (err ? reject(err) : resolve(raw)));
  });
}

/**
 * SMTP does not put a copy in the mailbox by itself, so the exact message that was sent is
 * appended to the account's Sent folder over IMAP (flagged as read). Returns the folder used.
 */
async function saveToSent(raw) {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST || process.env.SMTP_HOST,
    port: Number(process.env.IMAP_PORT || 993),
    secure: (process.env.IMAP_SECURE ?? 'true') === 'true',
    auth: { user: process.env.SMTP_USER, pass: smtpPass() },
    // Trust exactly this certificate (for servers whose IMAP uses a self-signed cert); verification stays on.
    tls: process.env.IMAP_CA_FILE
      ? { ca: fs.readFileSync(path.resolve(__dirname, '../..', process.env.IMAP_CA_FILE)) }
      : undefined,
    logger: false,
  });

  await client.connect();
  try {
    let path = process.env.IMAP_SENT_FOLDER;
    if (!path) {
      const boxes = await client.list();
      path =
        boxes.find((b) => b.specialUse === '\\Sent')?.path ||
        boxes.find((b) => /^(inbox[./])?sent( items| mail| messages)?$/i.test(b.path))?.path;
    }
    if (!path) {
      await client.mailboxCreate('Sent');
      path = 'Sent';
    }
    await client.append(path, raw, ['\\Seen']);
    return path;
  } finally {
    await client.logout().catch(() => {});
  }
}

/**
 * Sends the reminder over SMTP, then files a copy in the Sent folder. A failure to file the copy
 * never counts as a failed send (the mail already went out); it comes back as `sentCopyError`.
 */
async function sendReminderEmail({ reminder, customer }) {
  const message = buildReminderMessage({ reminder, customer });
  const raw = await buildRaw(message);

  await getTransporter().sendMail({ envelope: { from: process.env.SMTP_USER, to: [message.to] }, raw });

  let sentCopyError = null;
  try {
    await saveToSent(raw);
  } catch (err) {
    sentCopyError = `Sent, but the copy could not be saved to the mailbox Sent folder: ${err.message}`;
  }
  return { sentCopyError };
}

module.exports = { isConfigured, buildReminderMessage, sendReminderEmail, saveToSent };
