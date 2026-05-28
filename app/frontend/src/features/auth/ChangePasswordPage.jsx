import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import { AuthBackground } from "../../components/ui/AuthBackground.jsx";
import { getErrorMessage, api } from "../../lib/api.js";
import { getPasswordChecks, isStrongPassword, passwordRuleMessage } from "../../lib/passwordPolicy.js";

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState("code");
  const [verificationCode, setVerificationCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const passwordChecks = getPasswordChecks(newPassword);
  const passwordIsValid = isStrongPassword(newPassword);

  useEffect(() => {
    requestCode();
  }, []);

  async function requestCode() {
    setMessage("");
    setError("");
    setSendingCode(true);

    try {
      await api.post("/auth/change-password/code");
      setMessage("Đã gửi mã xác nhận 6 số tới email của bạn.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerifyCode(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!/^\d{6}$/.test(verificationCode)) {
      setError("Vui lòng nhập mã xác nhận gồm 6 chữ số.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/auth/change-password/verify-code", { verificationCode });
      setMessage("");
      setStep("password");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (!passwordIsValid) {
      setError(passwordRuleMessage);
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/auth/change-password", { currentPassword, newPassword, verificationCode });
      setMessage("Đổi mật khẩu thành công.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setVerificationCode("");
      setStep("code");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(window.location.protocol === "file:" ? "/workspaces" : "/");
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
            {step === "code" ? <MailCheck className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
          </div>
          <h1 className="font-heading text-4xl italic leading-none text-white">
            {step === "code" ? "Xác nhận mã" : "Đổi mật khẩu"}
          </h1>
            <p className="mt-2 text-sm font-light text-white/58">
            {step === "code"
              ? "Nhập mã 6 số đã gửi tới email của tài khoản trước khi đổi mật khẩu."
              : "Mã xác nhận hợp lệ. Nhập mật khẩu hiện tại và mật khẩu mới để hoàn tất."}
          </p>
        </div>

        {step === "code" ? (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">Mã xác nhận 6 số</label>
              <input
                inputMode="numeric"
                maxLength={6}
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-full border border-white/15 bg-white/8 px-4 py-3 text-center text-lg font-semibold tracking-[0.35em] outline-none transition focus:border-white/50"
                placeholder="000000"
              />
            </div>

            <StatusMessage message={message} error={error} />

            <button
              type="submit"
              disabled={submitting}
              className="liquid-glass-strong flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:scale-[1.01]"
            >
              {submitting ? "Đang kiểm tra mã..." : "Xác nhận mã"}
            </button>

            <button
              type="button"
              onClick={requestCode}
              disabled={sendingCode}
              className="w-full rounded-full border border-white/14 bg-white/7 px-5 py-3 text-sm font-semibold text-white/72 transition hover:bg-white/10 disabled:opacity-60"
            >
              {sendingCode ? "Đang gửi mã..." : "Gửi lại mã"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordField label="Mật khẩu hiện tại" value={currentPassword} onChange={setCurrentPassword} />
            <PasswordField label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} />
            <PasswordChecklist checks={passwordChecks} />
            <PasswordField label="Xác nhận mật khẩu mới" value={confirmPassword} onChange={setConfirmPassword} />

            <StatusMessage message={message} error={error} />

            <button
              type="submit"
              disabled={submitting || !passwordIsValid || newPassword !== confirmPassword}
              className="liquid-glass-strong flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:scale-[1.01] disabled:opacity-60"
            >
              {submitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="w-full rounded-full border border-white/14 bg-white/7 px-5 py-3 text-sm font-semibold text-white/72 transition hover:bg-white/10"
            >
              Hủy bỏ
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-white/70">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-full border border-white/15 bg-white/8 px-4 py-3 text-sm outline-none transition focus:border-white/50"
      />
    </div>
  );
}

function PasswordChecklist({ checks }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/7 px-4 py-3">
      <p className="mb-2 text-xs font-medium text-white/58">Ví dụ hợp lệ: Example123</p>
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

function StatusMessage({ message, error }) {
  return (
    <>
      {message && <div className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">{message}</div>}
      {error && <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</div>}
    </>
  );
}
