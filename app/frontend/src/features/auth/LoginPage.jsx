import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpRight, ClipboardCheck, LayoutDashboard, MonitorSmartphone, Sparkles } from "lucide-react";
import { useAuth } from "../../app/AuthContext.jsx";
import { AuthBackground } from "../../components/ui/AuthBackground.jsx";
import { AuthHomeButton } from "../../components/ui/AuthHomeButton.jsx";
import { getErrorMessage } from "../../lib/api.js";

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState(() => localStorage.getItem("rememberedIdentifier") || "");
  const [password, setPassword] = useState(() => {
    const saved = localStorage.getItem("rememberedPassword");
    return saved ? atob(saved) : "";
  });
  const [remember, setRemember] = useState(() => localStorage.getItem("rememberMe") === "true");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/workspaces" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(identifier, password, remember);
      navigate(searchParams.get("redirect") || "/workspaces");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10 font-body text-white">
      <AuthBackground />
      <AuthHomeButton to="/" label="Trang chủ" />
      <div className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <section className="hidden lg:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full liquid-glass px-3 py-1.5 text-xs text-white/80">
            <span className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-black">Minimum Viable Product</span>
            Damess cho doanh nghiệp
          </div>
          <h1 className="max-w-2xl font-heading text-7xl italic leading-[0.82] text-white">
            Vận hành yêu cầu công việc tinh gọn hơn.
          </h1>
          <p className="mt-6 max-w-lg text-base font-light leading-7 text-white/64">
            Tạo yêu cầu, phân công xử lý, theo dõi tiến độ và lưu lịch sử thao tác trong một không gian làm việc thống nhất.
          </p>
          <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
            {[
              { title: "Tạo yêu cầu", desc: "Gửi và phân loại yêu cầu nội bộ nhanh chóng.", icon: ClipboardCheck },
              { title: "Theo dõi tiến độ", desc: "Xem trạng thái, người xử lý và lịch sử thao tác.", icon: LayoutDashboard },
              { title: "Web & App", desc: "Web tiện truy cập, app dành cho xử lý chuyên sâu.", icon: MonitorSmartphone },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="liquid-glass rounded-2xl p-4">
                  <Icon className="mb-4 h-5 w-5 text-white/70" />
                  <div className="text-sm font-medium text-white">{item.title}</div>
                  <div className="mt-1 text-xs leading-5 text-white/45">{item.desc}</div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="liquid-glass w-full rounded-[32px] p-8 shadow-soft">
          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="font-heading text-4xl italic leading-none text-white">Đăng nhập hệ thống</h1>
            <p className="mt-2 text-sm font-light text-white/58">Tiếp tục xử lý và theo dõi yêu cầu công việc</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/70">Email hoặc username</label>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="w-full rounded-full border border-white/15 bg-white/8 px-4 py-3 text-sm outline-none transition focus:border-white/50"
              placeholder="Nhập email hoặc username"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/70">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-full border border-white/15 bg-white/8 px-4 py-3 text-sm outline-none transition focus:border-white/50"
              placeholder="Nhập mật khẩu"
            />
          </div>

          {error && <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</div>}

          <div className="flex items-center justify-between text-sm py-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-white/60 hover:text-white transition">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="rounded border-white/15 bg-white/10 text-white focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer h-4 w-4 accent-white"
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <Link to="/forgot-password" className="text-white/45 hover:text-white transition">
              Quên mật khẩu?
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="liquid-glass-strong flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:scale-[1.01] disabled:opacity-60"
          >
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
            {!submitting && <ArrowUpRight className="h-4 w-4" />}
          </button>

          <div className="text-center text-sm text-white/58">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="font-medium text-white hover:text-white/75">
              Đăng ký ngay
            </Link>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
