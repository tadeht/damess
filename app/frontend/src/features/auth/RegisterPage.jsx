import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowUpRight, MailCheck, RefreshCw } from "lucide-react";
import { useAuth } from "../../app/AuthContext.jsx";
import { AuthBackground } from "../../components/ui/AuthBackground.jsx";
import { AuthHomeButton } from "../../components/ui/AuthHomeButton.jsx";
import { getErrorMessage, api } from "../../lib/api.js";
import { getPasswordChecks, isStrongPassword, passwordRuleMessage } from "../../lib/passwordPolicy.js";

export function RegisterPage() {
  const { isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredUsername, setRegisteredUsername] = useState("");
  const [resending, setResending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const passwordChecks = getPasswordChecks(form.password);
  const passwordIsValid = isStrongPassword(form.password);

  if (isAuthenticated) {
    return <Navigate to="/workspaces" replace />;
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

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
      const { confirmPassword, ...payload } = form;
      const response = await api.post("/auth/register", payload);
      setMessage(response.data.message || "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.");
      setRegisteredEmail(form.email);
      setRegisteredUsername(response.data.data?.username || "");
      setForm({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError("");
    setMessage("");
    setResending(true);

    try {
      const response = await api.post("/auth/resend-verification", { email: registeredEmail });
      setMessage(response.data.message || "Đã gửi lại email xác thực.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  if (registeredEmail) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10 font-body text-white">
        <AuthBackground />
        <AuthHomeButton to="/login" label="Đăng nhập" />
        <div className="liquid-glass relative w-full max-w-md rounded-[32px] p-8 text-center shadow-soft">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-white text-black">
            <MailCheck className="h-7 w-7" />
          </div>
          <h1 className="font-heading text-4xl italic leading-none text-white">Chờ xác thực email</h1>
          <p className="mt-4 text-sm font-light leading-6 text-white/62">
            Hệ thống đã gửi link xác thực đến <span className="font-medium text-white">{registeredEmail}</span>. Vui lòng mở email và bấm link xác thực để kích hoạt tài khoản.
          </p>
          {registeredUsername && (
            <div className="mt-4 rounded-2xl bg-white/7 px-4 py-3 text-sm text-white/70">
              Username của bạn: <span className="font-semibold text-white">@{registeredUsername}</span>
            </div>
          )}

          {message && <div className="mt-5 rounded-2xl bg-green-500/15 px-4 py-3 text-left text-sm text-green-100">{message}</div>}
          {error && <div className="mt-5 rounded-2xl bg-red-500/15 px-4 py-3 text-left text-sm text-red-100">{error}</div>}

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="liquid-glass-strong inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {resending ? "Đang gửi lại..." : "Gửi lại email xác thực"}
              {!resending && <RefreshCw className="h-4 w-4" />}
            </button>
            <Link to="/login" className="inline-flex w-full items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white/70 hover:bg-white/10">
              Tôi đã xác thực, quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10 font-body text-white">
      <AuthBackground />
      <AuthHomeButton to="/login" label="Đăng nhập" />
      <div className="liquid-glass relative w-full max-w-md rounded-[32px] p-8 shadow-soft">
        <div className="mb-6">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
            <MailCheck className="h-5 w-5" />
          </div>
          <h1 className="font-heading text-4xl italic leading-none text-white">Đăng ký tài khoản</h1>
          <p className="mt-2 text-sm font-light text-white/58">Sau khi đăng ký, hệ thống sẽ gửi email xác thực đến hộp thư của bạn.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Họ tên" value={form.fullName} onChange={(value) => updateField("fullName", value)} />
          <Field label="Email" value={form.email} onChange={(value) => updateField("email", value)} />
          <Field label="Số điện thoại" value={form.phone} onChange={(value) => updateField("phone", value)} />
          <Field label="Mật khẩu" type="password" value={form.password} onChange={(value) => updateField("password", value)} />
          <PasswordChecklist checks={passwordChecks} />
          <Field label="Xác nhận mật khẩu" type="password" value={form.confirmPassword} onChange={(value) => updateField("confirmPassword", value)} />

          {message && <div className="rounded-2xl bg-green-500/15 px-4 py-3 text-sm text-green-100">{message}</div>}
          {error && <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</div>}

          <button
            type="submit"
            disabled={submitting || !passwordIsValid || form.password !== form.confirmPassword}
            className="liquid-glass-strong flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? "Đang đăng ký..." : "Đăng ký"}
            {!submitting && <ArrowUpRight className="h-4 w-4" />}
          </button>

          <div className="text-center text-sm text-white/58">
            Đã có tài khoản?{" "}
            <Link to="/login" className="font-medium text-white hover:text-white/75">
              Đăng nhập
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
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

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-white/70">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-full border border-white/15 bg-white/8 px-4 py-3 text-sm outline-none focus:border-white/50"
      />
    </div>
  );
}
