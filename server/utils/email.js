const getMailer = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  try {
    // Lazy require so server still runs if dependency is not installed yet.
    // eslint-disable-next-line global-require
    const nodemailer = require("nodemailer");
    return nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure:
        String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: { user, pass },
    });
  } catch (_error) {
    return null;
  }
};

const sendEmail = async ({ to, subject, text, html }) => {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  if (!to || !subject || !from) {
    return { sent: false, reason: "missing-fields" };
  }

  const mailer = getMailer();
  if (!mailer) {
    return { sent: false, reason: "mailer-not-configured" };
  }

  try {
    await mailer.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    return { sent: true };
  } catch (error) {
    return { sent: false, reason: error.message || "send-failed" };
  }
};

const sendSubscriptionStatusEmail = async ({
  to,
  fullName,
  status,
  plan,
  renewalDate,
}) => {
  const safeName = fullName || "Golfer";
  const renewalLine = renewalDate ? `Renewal date: ${renewalDate}` : "";
  const subject =
    status === "active"
      ? "Subscription Activated"
      : status === "cancelled"
        ? "Subscription Cancelled"
        : "Subscription Status Updated";

  const text = [
    `Hi ${safeName},`,
    "",
    `Your subscription status is now: ${status}.`,
    plan ? `Plan: ${plan}` : "",
    renewalLine,
    "",
    "Thank you for supporting golf and charity impact.",
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({ to, subject, text });
};

const sendWinnerAnnouncementEmail = async ({
  to,
  fullName,
  monthLabel,
  tier,
  amount,
}) => {
  const safeName = fullName || "Golfer";
  const subject = "You won this month's draw";
  const text = [
    `Hi ${safeName},`,
    "",
    `Great news. You won in ${monthLabel || "this month's"} draw.`,
    `Match tier: ${tier}`,
    `Prize amount: INR ${Number(amount || 0).toLocaleString("en-IN")}`,
    "",
    "Please upload your proof in dashboard if required.",
  ].join("\n");

  return sendEmail({ to, subject, text });
};

const sendWinnerVerificationEmail = async ({
  to,
  fullName,
  status,
  rejectionReason,
}) => {
  const safeName = fullName || "Golfer";
  const subject =
    status === "approved"
      ? "Prize Verification Approved"
      : status === "rejected"
        ? "Prize Verification Rejected"
        : "Prize Verification Updated";

  const text = [
    `Hi ${safeName},`,
    "",
    `Your prize verification status is now: ${status}.`,
    status === "rejected" && rejectionReason
      ? `Reason: ${rejectionReason}`
      : "",
    "",
    "You can check full details in your dashboard.",
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({ to, subject, text });
};

const sendWinnerPaymentEmail = async ({ to, fullName, amount }) => {
  const safeName = fullName || "Golfer";
  const subject = "Prize Payment Processed";
  const text = [
    `Hi ${safeName},`,
    "",
    "Your prize payment has been marked as paid.",
    amount !== undefined
      ? `Amount: INR ${Number(amount || 0).toLocaleString("en-IN")}`
      : "",
    "",
    "Thank you for playing and supporting charity through golf.",
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({ to, subject, text });
};

module.exports = {
  sendEmail,
  sendSubscriptionStatusEmail,
  sendWinnerAnnouncementEmail,
  sendWinnerVerificationEmail,
  sendWinnerPaymentEmail,
};
