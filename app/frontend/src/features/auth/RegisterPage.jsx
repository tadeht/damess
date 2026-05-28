import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, MailCheck, RefreshCw } from "lucide-react";
import { useAuth } from "../../app/AuthContext.jsx";
import { AuthBackground } from "../../components/ui/AuthBackground.jsx";
import { AuthHomeButton } from "../../components/ui/AuthHomeButton.jsx";
import { getErrorMessage, api } from "../../lib/api.js";
import { getPasswordChecks, isStrongPassword, passwordRuleMessage } from "../../lib/passwordPolicy.js";

export function RegisterPage() {
  const { isAuthenticated, updateUser } = useAuth();
  const [step, setStep] = useState("email"); // "email", "code", "details"
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const passwordChecks = getPasswordChecks(form.password);
  const passwordIsValid = isStrongPassword(form.password);

  if (isAuthenticated) {
    return <Navigate to="/workspaces" replace />;
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  // Gửi mã xác nhận đến email
  async function handleRequestCode(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.email.trim()) {
      setError("Email là bắt buộc");
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post("/auth/register/code", { email: form.email });
      setMessage(response.data.message || "Đã gửi mã xác nhận 6 số tới email của bạn.");
      setStep("code");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Gửi lại mã xác nhận
  async function handleResendCode() {
    setError("");
    setMessage("");
    setResending(true);

    try {
      const response = await api.post("/auth/register/code", { email: form.email });
      setMessage(response.data.message || "Đã gửi lại mã xác nhận. Mã cũ đã bị vô hiệu hóa.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  // Xác nhận mã 6 số
  async function handleVerifyCode(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(verificationCode)) {
      setError("Vui lòng nhập mã xác nhận gồm 6 chữ số.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/auth/register/verify-code", { email: form.email, verificationCode });
      setMessage("Mã xác nhận hợp lệ. Vui lòng nhập thông tin tài khoản để hoàn tất.");
      setStep("details");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Hoàn tất đăng ký
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.fullName.trim() || !form.username.trim() || !form.password) {
      setError("Vui lòng điền đầy đủ tất cả các trường.");
      return;
    }

    if (!passwordIsValid) {
      setError(passwordRuleMessage);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        username: form.username,
        password: form.password,
        verificationCode,
      };
      const response = await api.post("/auth/register", payload);
      
      const { token, user: registeredUser } = response.data.data;
      
      // Đăng nhập tự động sau khi đăng ký thành công
      sessionStorage.setItem("accessToken", token);
      updateUser(registeredUser);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10 font-body text-white">
      <AuthBackground />
      <AuthHomeButton to="/login" label="Đăng nhập" />
      
      <div className="liquid-glass relative w-full max-w-md rounded-[32px] p-8 shadow-soft">
        {step !== "email" && (
          <button
            type="button"
            onClick={() => {
              setError("");
              setMessage("");
              if (step === "code") setStep("email");
              if (step === "details") setStep("code");
            }}
            className="mb-7 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-2 text-sm text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>
        )}

        <div className="mb-6">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
            <MailCheck className="h-5 w-5" />
          </div>
          <h1 className="font-heading text-4xl italic leading-none text-white">
            {step === "email" && "Đăng ký tài khoản"}
            {step === "code" && "Xác thực email"}
            {step === "details" && "Thông tin cá nhân"}
          </h1>
          <p className="mt-2 text-sm font-light text-white/58">
            {step === "email" && "Nhập email của bạn. Hệ thống sẽ gửi mã xác nhận để tránh tài khoản ảo."}
            {step === "code" && `Mã xác nhận 6 số đã được gửi tới email ${form.email}`}
            {step === "details" && "Vui lòng nhập tên hiển thị, tên đăng nhập và mật khẩu bảo mật."}
          </p>
        </div>

        {step === "email" && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <Field
              label="Email đăng ký"
              value={form.email}
              onChange={(value) => updateField("email", value)}
              type="email"
              placeholder="nhap-email@gmail.com"
            />
            {error && <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</div>}
            <button
              type="submit"
              disabled={submitting}
              className="liquid-glass-strong flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? "Đang gửi mã..." : "Gửi mã xác nhận"}
              {!submitting && <ArrowUpRight className="h-4 w-4" />}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/7 px-4 py-3 text-sm text-white/68">
              {form.email}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">Mã xác nhận 6 số</label>
              <input
                inputMode="numeric"
                maxLength={6}
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-full border border-white/15 bg-white/8 px-4 py-3 text-center text-lg font-semibold tracking-[0.35em] text-white outline-none transition focus:border-white/50"
                placeholder="000000"
              />
            </div>
            {message && <div className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">{message}</div>}
            {error && <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</div>}
            
            <button
              type="submit"
              disabled={submitting}
              className="liquid-glass-strong flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? "Đang kiểm tra..." : "Xác nhận mã"}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending}
              className="w-full rounded-full border border-white/14 bg-white/7 px-5 py-3 text-sm font-semibold text-white/72 transition hover:bg-white/10 disabled:opacity-60"
            >
              {resending ? "Đang gửi lại..." : "Gửi lại mã"}
            </button>
          </form>
        )}

        {step === "details" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/7 px-4 py-3 text-sm text-white/50">
              Email xác thực: <span className="font-semibold text-white">{form.email}</span>
            </div>
            <Field
              label="Họ tên hiển thị"
              value={form.fullName}
              onChange={(value) => updateField("fullName", value)}
              placeholder="Nguyễn Văn A"
            />
            <Field
              label="Tên đăng nhập (username)"
              value={form.username}
              onChange={(value) => updateField("username", value)}
              placeholder="username123"
            />
            <Field
              label="Mật khẩu"
              type="password"
              value={form.password}
              onChange={(value) => updateField("password", value)}
              placeholder="Nhập mật khẩu"
            />
            <PasswordChecklist checks={passwordChecks} />
            <Field
              label="Xác nhận mật khẩu"
              type="password"
              value={form.confirmPassword}
              onChange={(value) => updateField("confirmPassword", value)}
              placeholder="Xác nhận mật khẩu"
            />

            {message && <div className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">{message}</div>}
            {error && <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</div>}

            <button
              type="submit"
              disabled={submitting || !passwordIsValid || form.password !== form.confirmPassword}
              className="liquid-glass-strong flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? "Đang đăng ký..." : "Hoàn tất đăng ký"}
              {!submitting && <ArrowUpRight className="h-4 w-4" />}
            </button>
          </form>
        )}

        {step === "email" && (
          <div className="text-center text-sm text-white/58 mt-6">
            Đã có tài khoản?{" "}
            <Link to="/login" className="font-medium text-white hover:text-white/75">
              Đăng nhập
            </Link>
          </div>
        )}
      </div>
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

function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-white/70">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-white/15 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-white/50"
      />
    </div>
  );
}
