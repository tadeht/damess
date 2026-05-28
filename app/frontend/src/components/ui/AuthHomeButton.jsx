import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

export function AuthHomeButton({ to = "/", label = "Trở lại" }) {
  const navigate = useNavigate();

  if (window.location.protocol === "file:" && to === "/") {
    return null;
  }

  function handleBack() {
    navigate(to);
  }

  return createPortal(
    <button
      type="button"
      onClick={handleBack}
      className="auth-back-button"
      style={{ position: "fixed", top: "14px", left: "14px", right: "auto", bottom: "auto" }}
      aria-label={label}
    >
      <span className="auth-back-button__icon">
        <ArrowLeft className="h-4 w-4" />
      </span>
      <span className="hidden sm:inline">{label}</span>
      <Sparkles className="hidden h-4 w-4 text-white/48 sm:block" />
    </button>,
    document.body,
  );
}
