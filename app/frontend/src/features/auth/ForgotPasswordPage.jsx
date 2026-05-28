import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import { useAuth } from "../../app/AuthContext.jsx";
import { AuthBackground } from "../../components/ui/AuthBackground.jsx";
import { getErrorMessage, api } from "../../lib/api.js";
import { getPasswordChecks, isStrongPassword, passwordRuleMessage } from "../../lib/passwordPolicy.js";

export function ForgotPasswordPage() {
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const passwordChecks = getPasswordChecks(newPassword);
  const passwordIsValid = isStrongPassword(newPassword);

  if (isAuthenticated) {
    return <Navigate to="/workspaces" replace />;
  }

  async function requestCode(event) {
    event?.preventDefault();
    setMessage("");
    setError("");
    setSubmitting(true);

    try {
      const response = await api.post("/auth/forgot-password/code", { email });
      setMessage(response.data.message || "Đã gửi mã xác nhận 6 số tới email của bạn.");
      setStep("code");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function resendCode() {
    setMessage("");
    setError("");
    setResending(true);

    try {
      const response = await api.post("/auth/forgot-password/code", { email });
      setResetCode("");
      setMessage(response.data.message || "Đã gửi lại mã xác nhận. Mã cũ đã bị vô hiệu hóa.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!/^\d{6}$/.test(resetCode)) {
      setError("Vui lòng nhập mã xác nhận gồm 6 chữ số.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/auth/forgot-password/verify-code", { email, resetCode });
      setMessage("");
      setStep("password");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (!passwordIsValid) {
      setError(passwordRuleMessage);
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post("/auth/forgot-password/reset", { email, resetCode, newPassword });
      setMessage(response.data.message || "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.");
      setNewPassword("");
      setConfirmPassword("");
      setStep("done");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10 font-body text-white">
      <AuthBackground />
      <div className="liquid-glass relative w-full max-w-md rounded-[32px] p-8 shadow-soft">
        {window.location.protocol !== "file:" && (
          <Link to="/" className="mb-7 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Về trang chủ
          </Link>
        )}

        <div className="mb-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
            {step === "email" && <MailCheck className="h-5 w-5" />}
            {step === "code" && <ShieldCheck className="h-5 w-5" />}
            {(step === "password" || step === "done") && <KeyRound className="h-5 w-5" />}
          </div>
          <h1 className="font-heading text-4xl leading-none text-white">Quên mật khẩu</h1>
          <p className="mt-2 text-sm font-light text-white/58">
            {step === "email" && "Nhập email đã đăng ký để hệ thống gửi mã xác nhận đặt lại mật khẩu."}
            {step === "code" && "Nhập mã 6 số đã gửi tới email. Mã có hiệu lực trong 10 phút."}
            {step === "password" && "Mã xác nhận hợp lệ. Nhập mật khẩu mới để hoàn tất."}
            {step === "done" && "Mật khẩu đã được cập nhật. Bạn có thể quay lại màn đăng nhập."}
          </p>
        </div>

        {step === "email" && (
          <form onSubmit={requestCode} className="space-y-4">
            <TextField label="Email" type="email" value={email} onChange={setEmail} placeholder="Nhập email đã đăng ký" />
            <StatusMessage message={message} error={error} />
            <PrimaryButton disabled={submitting}>{submitting ? "Đang kiểm tra..." : "Gửi mã xác nhận"}</PrimaryButton>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verifyCode} className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/7 px-4 py-3 text-sm text-white/68">{email}</div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">Mã xác nhận 6 số</label>
              <input
                inputMode="numeric"
                maxLength={6}
                value={resetCode}
                onChange={(event) => setResetCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-full border border-white/15 bg-white/8 px-4 py-3 text-center text-lg font-semibold tracking-[0.35em] text-white outline-none transition focus:border-white/50"
                placeholder="000000"
              />
            </div>
            <StatusMessage message={message} error={error} />
            <PrimaryButton disabled={submitting}>{submitting ? "Đang kiểm tra mã..." : "Xác nhận mã"}</PrimaryButton>
            <button
              type="button"
              onClick={resendCode}
              disabled={resending}
              className="w-full rounded-full border border-white/14 bg-white/7 px-5 py-3 text-sm font-semibold text-white/72 transition hover:bg-white/10 disabled:opacity-60"
            >
              {resending ? "Đang gửi lại..." : "Gửi lại mã"}
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={resetPassword} className="space-y-4">
            <PasswordField label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} />
            <PasswordChecklist checks={passwordChecks} />
            <PasswordField label="Xác nhận mật khẩu mới" value={confirmPassword} onChange={setConfirmPassword} />
            <StatusMessage message={message} error={error} />
            <PrimaryButton disabled={submitting || !passwordIsValid || newPassword !== confirmPassword}>{submitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}</PrimaryButton>
          </form>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <StatusMessage message={message} error={error} />
            <Link
              to="/login"
              className="liquid-glass-strong flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:scale-[1.01]"
            >
              Quay lại đăng nhập
            </Link>
          </div>
        )}

        {step !== "done" && (
          <div className="mt-6 text-center text-sm">
            <Link to="/login" className="font-medium text-white/62 hover:text-white">
              Quay lại đăng nhập
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function TextField({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-white/70">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-white/15 bg-white/8 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/50"
      />
    </div>
  );
}

function PasswordField({ label, value, onChange }) {
  return <TextField label={label} type="password" value={value} onChange={onChange} />;
}

function PasswordChecklist({ checks }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/7 px-4 py-3">
      <p className="mb-2 text-xs font-medium text-white/58">Ví dụ hợp lệ: Datbn004</p>
      <div className="grid gap-1.5 text-xs">
        {checks.map((check) => (
          <div key={check.id} className={check.valid ? "text-emerald-200" : "text-white/45"}>
            {check.valid ? "✓" : "•"} {check.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function PrimaryButton({ children, disabled }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="liquid-glass-strong flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:scale-[1.01] disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function StatusMessage({ message, error }) {
  return (
    <>
      {message && <div className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">{message}</div>}
      {error && <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</div>}
    </>
  );
}
