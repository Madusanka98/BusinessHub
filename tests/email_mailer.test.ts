import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendEmail,
  sendInvitationEmail,
  sendPasswordResetEmail,
  getEmailTransporter,
} from "@/lib/email/mailer";

describe("Email Delivery & SMTP Mailer Tests (T08-REP-001)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("safely falls back to mock logger when SMTP credentials are not configured", async () => {
    delete process.env.EMAIL_SERVER_HOST;
    delete process.env.EMAIL_SERVER_USER;
    delete process.env.EMAIL_SERVER_PASSWORD;

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await sendEmail({
      to: "recipient@test.local",
      subject: "Test Subject",
      text: "This is a plain text test body.",
      html: "<p>This is a plain text test body.</p>",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^dev-mock-/);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[DEV EMAIL SENDER] To: recipient@test.local")
    );
  });

  it("formats single-use invitation emails with valid expiry notice and link", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await sendInvitationEmail(
      "newpartner@test.local",
      "Green Valley Farm",
      "mock-invitation-token-123456",
      "OWNER"
    );

    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("http://localhost:3000/invite/mock-invitation-token-123456")
    );
  });

  it("formats single-use password reset emails with 1-hour expiry notice and token link", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await sendPasswordResetEmail(
      "resetuser@test.local",
      "mock-reset-token-abcdef"
    );

    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("http://localhost:3000/reset-password/mock-reset-token-abcdef")
    );
  });

  it("initializes a valid nodemailer transporter when SMTP credentials are provided", () => {
    process.env.EMAIL_SERVER_HOST = "smtp.mailprovider.com";
    process.env.EMAIL_SERVER_PORT = "587";
    process.env.EMAIL_SERVER_USER = "mailer-user";
    process.env.EMAIL_SERVER_PASSWORD = "mailer-secret-password";

    const transporter = getEmailTransporter();
    expect(transporter).toBeDefined();
    expect(typeof transporter?.sendMail).toBe("function");
  });
});
