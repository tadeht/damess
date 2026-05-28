import { ArrowUpRight } from "lucide-react";

export function PageIntro({ eyebrow, title, description, action }) {
  return (
    <section className="app-section overflow-hidden rounded-[32px] p-6 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow && (
            <div className="mb-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-normal text-white/52">
              {eyebrow}
            </div>
          )}
          <h2 className="text-3xl font-semibold leading-tight text-white md:text-5xl">{title}</h2>
          {description && <p className="mt-3 max-w-2xl text-sm font-light leading-6 text-white/58 md:text-base">{description}</p>}
        </div>
        {action}
      </div>
    </section>
  );
}

export function GlassPanel({ title, description, children, className = "" }) {
  return (
    <section className={`app-section rounded-[28px] p-5 md:p-6 ${className}`}>
      {(title || description) && (
        <div className="mb-5">
          {title && <h3 className="text-xl font-semibold text-white">{title}</h3>}
          {description && <p className="mt-1 text-sm leading-6 text-white/52">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function MetricCard({ label, value, icon: Icon, tone = "default" }) {
  const toneClass = tone === "danger" ? "from-red-500/22 to-white/5" : "from-white/14 to-white/4";

  return (
    <div className={`app-section rounded-[26px] bg-gradient-to-br ${toneClass} p-5`}>
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-white/55">{label}</div>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-5 text-4xl font-semibold leading-none text-white md:text-5xl">{value}</div>
    </div>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button className={`app-button inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ActionLink({ children, className = "", ...props }) {
  return (
    <a className={`app-button inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm ${className}`} {...props}>
      {children}
      <ArrowUpRight className="h-4 w-4" />
    </a>
  );
}

export function DataShell({ children, className = "" }) {
  return (
    <div className={`app-section overflow-hidden rounded-[28px] ${className}`}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function EmptyState({ children }) {
  return <div className="p-8 text-center text-sm text-white/52">{children}</div>;
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-white/68">{label}</span>
      {children}
    </label>
  );
}
