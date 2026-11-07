import nodemailer from "nodemailer";
import { z } from "zod";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}
export type Mailer = (mail: Mail) => Promise<void>;

function smtpSettings() {
  const host = process.env.LATIDO_SMTP_HOST?.trim();
  const port = Number(process.env.LATIDO_SMTP_PORT || 587);
  const user = process.env.LATIDO_SMTP_USER?.trim();
  const pass = process.env.LATIDO_SMTP_PASSWORD;
  const from = process.env.LATIDO_SMTP_FROM?.trim();
  if (!host || ![465, 587].includes(port) || !user || !pass || !from || !z.email().safeParse(from).success) return null;
  return { host, port, user, pass, from };
}

export function smtpConfigured() {
  return smtpSettings() !== null;
}

let transport: ReturnType<typeof nodemailer.createTransport> | undefined;

export const sendMail: Mailer = async (mail) => {
  const smtp = smtpSettings();
  if (!smtp) throw new Error("newsletter SMTP unavailable");
  transport ??= nodemailer.createTransport({
    host: smtp.host, port: smtp.port, secure: smtp.port === 465, requireTLS: smtp.port === 587,
    auth: { user: smtp.user, pass: smtp.pass }, disableFileAccess: true, disableUrlAccess: true,
    connectionTimeout: 7_000, greetingTimeout: 5_000, socketTimeout: 8_000,
  });
  const result = await transport.sendMail({ ...mail, from: { name: "Latido", address: smtp.from } });
  if (!result.accepted.length) throw new Error("newsletter message not accepted");
};
