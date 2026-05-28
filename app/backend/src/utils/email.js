import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { AppError } from "./errors.js";

function createTransporter() {
  if (!env.mail.host || !env.mail.user || !env.mail.pass) {
    throw new AppError("Chưa cấu hình email gửi xác thực", 500);
  }

  return nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.port === 465,
    auth: {
      user: env.mail.user,
      pass: env.mail.pass,
    },
  });
}

export async function sendRegistrationCodeEmail({ to, code }) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: env.mail.from || env.mail.user,
    to,
    subject: "Mã xác nhận đăng ký tài khoản",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
        <h2 style="margin-bottom: 12px;">Xác nhận đăng ký tài khoản</h2>
        <p>Xin chào,</p>
        <p>Bạn đang đăng ký tài khoản mới trên Damess.</p>
        <p>Nhập mã xác nhận dưới đây để tiếp tục đăng ký:</p>
        <div style="margin: 28px 0; display: inline-block; padding: 14px 22px; border-radius: 16px; background: #111827; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 8px;">
          ${code}
        </div>
        <p style="font-size: 13px; color: #6b7280;">Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đăng ký, vui lòng bỏ qua email này.</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail({ to, fullName, token }) {
  const verificationUrl = `${env.frontendUrl}/verify-email?token=${token}`;
  const transporter = createTransporter();

  await transporter.sendMail({
    from: env.mail.from || env.mail.user,
    to,
    subject: "Xác thực email đăng ký tài khoản",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
        <h2 style="margin-bottom: 12px;">Xác thực tài khoản</h2>
        <p>Xin chào ${fullName},</p>
        <p>Bạn vừa đăng ký tài khoản trên Damess.</p>
        <p>Vui lòng bấm nút bên dưới để xác thực email và kích hoạt tài khoản.</p>
        <p style="margin: 28px 0;">
          <a href="${verificationUrl}" style="background: #111827; color: #ffffff; padding: 12px 18px; border-radius: 999px; text-decoration: none; display: inline-block;">
            Xác thực email
          </a>
        </p>
        <p>Nếu nút không hoạt động, hãy copy đường dẫn sau vào trình duyệt:</p>
        <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
        <p style="font-size: 13px; color: #6b7280;">Liên kết có hiệu lực trong 24 giờ.</p>
      </div>
    `,
  });
}

export async function sendPasswordChangeCodeEmail({ to, fullName, code }) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: env.mail.from || env.mail.user,
    to,
    subject: "Mã xác nhận đổi mật khẩu",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
        <h2 style="margin-bottom: 12px;">Xác nhận đổi mật khẩu</h2>
        <p>Xin chào ${fullName},</p>
        <p>Bạn vừa yêu cầu đổi mật khẩu trên Damess.</p>
        <p>Nhập mã xác nhận bên dưới để hoàn tất thao tác đổi mật khẩu:</p>
        <div style="margin: 28px 0; display: inline-block; padding: 14px 22px; border-radius: 16px; background: #111827; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 8px;">
          ${code}
        </div>
        <p style="font-size: 13px; color: #6b7280;">Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetCodeEmail({ to, fullName, code }) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: env.mail.from || env.mail.user,
    to,
    subject: "Ma xac nhan dat lai mat khau",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
        <h2 style="margin-bottom: 12px;">Dat lai mat khau</h2>
        <p>Xin chao ${fullName},</p>
        <p>Ban vua yeu cau dat lai mat khau tren Damess.</p>
        <p>Nhap ma xac nhan ben duoi de tiep tuc dat mat khau moi:</p>
        <div style="margin: 28px 0; display: inline-block; padding: 14px 22px; border-radius: 16px; background: #111827; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 8px;">
          ${code}
        </div>
        <p style="font-size: 13px; color: #6b7280;">Ma co hieu luc trong 10 phut. Khi ban gui lai ma, ma cu se bi vo hieu hoa.</p>
        <p style="font-size: 13px; color: #6b7280;">Neu ban khong yeu cau dat lai mat khau, vui long bo qua email nay.</p>
      </div>
    `,
  });
}

export async function sendNotificationEmail({ to, fullName, title, content, link }) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: env.mail.from || env.mail.user,
    to,
    subject: title,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
        <h2 style="margin-bottom: 12px;">${title}</h2>
        <p>Xin chào ${fullName},</p>
        <p>${content}</p>
        ${link ? `
          <p style="margin: 28px 0;">
            <a href="${link}" style="background: #111827; color: #ffffff; padding: 12px 18px; border-radius: 999px; text-decoration: none; display: inline-block;">
              Mở thông báo
            </a>
          </p>
          <p style="word-break: break-all; color: #2563eb;">${link}</p>
        ` : ""}
        <p style="font-size: 13px; color: #6b7280;">Email này được gửi vì bạn đang bật thông báo qua email.</p>
      </div>
    `,
  });
}
