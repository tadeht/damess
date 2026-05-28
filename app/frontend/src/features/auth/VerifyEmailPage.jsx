import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthBackground } from "../../components/ui/AuthBackground.jsx";
import { getErrorMessage, api } from "../../lib/api.js";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Đang xác thực email...");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Liên kết xác thực không hợp lệ.");
      return;
    }

    api.get(`/auth/verify-email?token=${token}`)
      .then((response) => {
        setStatus("success");
        setMessage(response.data.message || "Xác thực email thành công.");
      })
      .catch((error) => {
        setStatus("error");
        setMessage(getErrorMessage(error));
      });
  }, [searchParams]);

  const isSuccess = status === "success";
  const Icon = isSuccess ? CheckCircle2 : XCircle;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10 font-body text-white">
      <AuthBackground />
      <div className="liquid-glass relative w-full max-w-md rounded-[32px] p-8 text-center shadow-soft">
        <div className={`mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full ${isSuccess ? "bg-green-400/18 text-green-100" : "bg-red-400/18 text-red-100"}`}>
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="font-heading text-4xl italic leading-none text-white">
          {status === "loading" ? "Đang xác thực" : isSuccess ? "Email đã xác thực" : "Xác thực thất bại"}
        </h1>
        <p className="mt-4 text-sm font-light leading-6 text-white/62">{message}</p>
        <Link to="/login" className="liquid-glass-strong mt-8 inline-flex rounded-full px-5 py-3 text-sm font-semibold">
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}
