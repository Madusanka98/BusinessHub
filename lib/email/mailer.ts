import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

export interface MailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: MailAttachment[];
}

let cachedTransporter: Transporter | null = null;

/**
 * Returns a configured nodemailer SMTP transporter if credentials exist.
 */
export function getEmailTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.EMAIL_SERVER_HOST;
  const port = Number(process.env.EMAIL_SERVER_PORT) || 587;
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  const isSecure = port === 465;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });

  return cachedTransporter;
}

/**
 * Dispatches an email notification.
 * In development without SMTP credentials, safely logs the action and link to the console for testing.
 * In production or when SMTP is configured, dispatches via nodemailer transporter.
 */
export async function sendEmail(
  options: MailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const transporter = getEmailTransporter();

  if (!transporter) {
    // Safe development logging - never output passwords or raw sensitive payloads
    console.log(`[DEV EMAIL SENDER] To: ${options.to} | Subject: ${options.subject}`);
    console.log(`[DEV EMAIL SENDER Content Preview]:\n${options.text}\n`);
    return { success: true, messageId: `dev-mock-${Date.now()}` };
  }

  try {
    const from = process.env.EMAIL_FROM || "BusinessHub SaaS <noreply@businesshub.local>";
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    });

    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to dispatch email via SMTP transporter";
    console.error(`[SMTP ERROR] Failed to send email to ${options.to}:`, errorMsg);
    if (process.env.NODE_ENV !== "production") {
      return { success: false, error: errorMsg };
    }
    throw new Error(`Email dispatch failed: ${errorMsg}`);
  }
}

/**
 * Sends a single-use business invitation email.
 */
export async function sendInvitationEmail(
  to: string,
  businessName: string,
  rawToken: string,
  role: string
): Promise<{ success: boolean }> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${rawToken}`;

  const text = `You have been invited to join ${businessName} on BusinessHub SaaS as ${role}.\n\nClick the link below to set up your account:\n${inviteUrl}\n\nThis single-use link expires in 48 hours. If you did not expect this invitation, please ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>Invitation to Join ${businessName}</h2>
      <p>You have been invited to join <strong>${businessName}</strong> as a <strong>${role}</strong>.</p>
      <p><a href="${inviteUrl}" style="background-color: #0f172a; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation & Set Up Account</a></p>
      <p><small>This single-use link will expire in 48 hours. Never share this link with anyone.</small></p>
    </div>
  `;

  return await sendEmail({
    to,
    subject: `Invitation to join ${businessName} on BusinessHub`,
    text,
    html,
  });
}

/**
 * Sends a single-use password reset email.
 */
export async function sendPasswordResetEmail(
  to: string,
  rawToken: string
): Promise<{ success: boolean }> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password/${rawToken}`;

  const text = `We received a request to reset your password on BusinessHub SaaS.\n\nClick the link below to set a new password:\n${resetUrl}\n\nThis single-use link expires in 1 hour. If you did not request this, please ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>Reset Your Password</h2>
      <p>We received a request to reset your BusinessHub account password.</p>
      <p><a href="${resetUrl}" style="background-color: #0f172a; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
      <p><small>This single-use link will expire in 1 hour.</small></p>
    </div>
  `;

  return await sendEmail({
    to,
    subject: "Reset your BusinessHub password",
    text,
    html,
  });
}
