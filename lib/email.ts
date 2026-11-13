import "server-only";
import { BRAND } from "./brand";
import { openSecret, setting } from "./secrets";

export type EmailSettings = { provider: "smtp" | "resend"; from: string; resendKey?: string; host?: string; port?: number; secure?: boolean; user?: string; pass?: string };
type Mailer = { from: string; send: (to: string, subject: string, text: string) => Promise<boolean>; source: "env" | "panel" };

/** How mail goes out: Resend from the server environment, else what the platform owner saved under Configuration. */
async function mailer(override?: EmailSettings): Promise<Mailer | null> {
  if (!override && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) return resend(process.env.RESEND_API_KEY, process.env.RESEND_FROM_EMAIL, "env");
  const saved = override || (await setting<EmailSettings>("email"));
  if (!saved?.from) return null;
  if (saved.provider === "resend") return saved.resendKey ? resend(override ? saved.resendKey : openSecret(saved.resendKey), saved.from, "panel") : null;
  if (!saved.host || !saved.user || !saved.pass) return null;
  const pass = override ? saved.pass : openSecret(saved.pass);
  return {
    from: saved.from,
    source: "panel",
    send: async (to, subject, text) => {
      const { createTransport } = await import("nodemailer");
      const transport = createTransport({ host: saved.host, port: saved.port || 465, secure: saved.secure ?? (saved.port || 465) === 465, auth: { user: saved.user, pass }, connectionTimeout: 10000 });
      await transport.sendMail({ from: saved.from, to, subject, text });
      return true;
    },
  };
}
function resend(key: string, from: string, source: Mailer["source"]): Mailer {
  return {
    from,
    source,
    send: async (to, subject, text) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, text }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`Resend refused the message (HTTP ${response.status}).`);
      return true;
    },
  };
}

export async function sendEmail(to: string, subject: string, text: string) {
  try {
    const mail = await mailer();
    return mail ? await mail.send(to, subject, text) : false;
  } catch {
    return false;
  }
}
/** Sends a test message with settings that are not saved yet; throws the provider's reason on failure. */
export async function testEmail(settings: EmailSettings, to: string) {
  const mail = await mailer(settings);
  if (!mail) throw new Error("Fill in every email setting first.");
  await mail.send(to, `${BRAND} email is working`, `This test message confirms that ${BRAND} can send email.`);
}
export async function emailStatus() {
  const mail = await mailer();
  return { configured: !!mail, source: mail?.source || "none", from: mail?.from || "" };
}
export async function emailDeliveryConfigured() {
  return !!(await mailer());
}

export const sendPasswordResetEmail = (to: string, link: string) => sendEmail(to, `Reset your ${BRAND} password`, `Use this secure link within 30 minutes to reset your password: ${link}`);
export const sendEmailVerificationEmail = (to: string, link: string) => sendEmail(to, `Verify your ${BRAND} email`, `Verify your ${BRAND} account within 24 hours: ${link}`);
export const sendWorkspaceInvitationEmail = (to: string, link: string, workspace: string, role: string) =>
  sendEmail(to, `You have been invited to ${workspace}`, `You were invited as a ${role} member of ${workspace}. Accept the invitation within 7 days: ${link}`);
export const sendLoginCode = (to: string, code: string) => sendEmail(to, `${code} is your ${BRAND} sign-in code`, `Your ${BRAND} sign-in code is ${code}. It works for 10 minutes. If you did not try to sign in, change your password.`);
export const sendWelcome = (to: string, name: string) =>
  sendEmail(to, `Welcome to ${BRAND}`, `Hi ${name},

Your ${BRAND} account is ready. Sign in any time at ${process.env.APP_URL}/login to create and manage your QR codes.`);
export const sendPaymentReceipt = (to: string, payment: { plan: string; amountPaise: number; until: Date | null; reference?: string | null }) =>
  sendEmail(
    to,
    `Payment received: ${BRAND} ${payment.plan}`,
    `Thank you. We received ₹${(payment.amountPaise / 100).toLocaleString("en-IN")} for the ${payment.plan} plan.${payment.until ? `
Your plan is active until ${payment.until.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.` : ""}${payment.reference ? `
Reference: ${payment.reference}` : ""}

Manage your plan: ${process.env.APP_URL}/dashboard#billing`,
  );
