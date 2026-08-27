import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

async function send({ to, subject, html }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[mailer] SMTP not configured — skipping email to ${to}: ${subject}`);
    return;
  }
  await t.sendMail({ from: process.env.SMTP_FROM || 'no-reply@example.com', to, subject, html });
}

export async function sendPasswordResetEmail({ to, resetUrl }) {
  await send({
    to,
    subject: 'Reset your Sapiion Workplace password',
    html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}

export async function sendApplicationEmail({ to, subject, body, replyTo }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[mailer] SMTP not configured — skipping application email to ${to}: ${subject}`);
    return;
  }
  await t.sendMail({ from: process.env.SMTP_FROM || 'no-reply@example.com', to, subject, html: body, replyTo });
}

// Sent to both the student and the supervisor when a coordinator schedules an
// interim review — each needs to confirm/decline attendance independently.
export async function sendReviewScheduledEmail({ to, studentName, scheduledDate, actionUrl }) {
  await send({
    to,
    subject: `Interim review scheduled for ${studentName} — ${scheduledDate}`,
    html: `
      <p>A school interim review has been scheduled for <strong>${studentName}</strong>'s internship on <strong>${scheduledDate}</strong>.</p>
      <p>Please confirm whether you can attend:</p>
      <p><a href="${actionUrl}">${actionUrl}</a></p>
    `,
  });
}
