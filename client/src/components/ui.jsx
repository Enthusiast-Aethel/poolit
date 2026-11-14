import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import Icon from "./Icon";
import { initials } from "../utils/format";

// ---------- shared class names ----------
export const inputCls =
  "w-full h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-lg bg-secondary-container text-on-secondary-fixed font-label-lg text-label-lg font-bold shadow-md hover:bg-secondary-fixed-dim transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
export const btnNavy =
  "inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg font-bold shadow-md hover:bg-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
export const btnSecondary =
  "inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg bg-surface-container text-on-surface font-label-md text-label-md font-bold hover:bg-surface-container-high transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
export const btnDanger =
  "inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg bg-error-container text-on-error-container font-label-md text-label-md font-bold hover:opacity-90 transition-opacity disabled:opacity-60";
export const thCls =
  "px-4 py-3 font-label-sm text-label-sm font-bold uppercase tracking-wider text-on-surface-variant whitespace-nowrap";
export const tdCls = "px-4 py-3 font-body-md text-body-md text-on-surface";

// ---------- layout bits ----------
export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
      <div>
        {eyebrow && <p className="font-label-sm text-label-sm text-secondary font-bold tracking-wider uppercase">{eyebrow}</p>}
        <h1 className="font-headline-lg text-headline-lg font-bold text-primary-container tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 font-body-md text-body-md text-on-surface-variant max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, note, icon, tone = "default" }) {
  const accent = { default: "", gold: "border-l-4 border-secondary-container", bad: "border-l-4 border-error" }[tone];
  return (
    <div className={`rounded-xl bg-surface-container-lowest p-5 shadow-sm flex flex-col justify-between gap-3 ${accent}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-label-md text-label-md text-on-surface-variant font-bold">{label}</span>
        {icon && <Icon name={icon} className="text-secondary text-[20px]" />}
      </div>
      <div>
        <div className={`font-headline-md text-headline-md font-bold ${tone === "bad" ? "text-error" : "text-primary-container"}`}>{value}</div>
        {note && <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">{note}</p>}
      </div>
    </div>
  );
}

const PILL = {
  good: "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant",
  warn: "bg-warning-container text-on-warning-container",
  bad: "bg-error-container text-on-error-container",
  neutral: "bg-surface-container text-on-surface-variant",
  navy: "bg-primary-container text-on-primary",
};
export const Pill = ({ tone = "neutral", children }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold whitespace-nowrap ${PILL[tone]}`}>
    {children}
  </span>
);

const LOAN_STATUS = {
  pending: ["warn", "Pending approval"],
  approved: ["warn", "Awaiting disbursement"],
  active: ["good", "Active"],
  overdue: ["bad", "Overdue"],
  cleared: ["neutral", "Cleared"],
  rejected: ["neutral", "Rejected"],
};
export function LoanStatusPill({ status }) {
  const [tone, label] = LOAN_STATUS[status] || ["neutral", status];
  return <Pill tone={tone}>{label}</Pill>;
}

export const Avatar = ({ name, size = "w-10 h-10" }) => (
  <div className={`${size} rounded-full bg-primary-container text-secondary-fixed flex items-center justify-center font-label-md text-label-md font-bold shrink-0`}>
    {initials(name)}
  </div>
);

export const Loading = ({ text = "Loading…" }) => (
  <div className="py-16 text-center text-on-surface-variant font-body-md">{text}</div>
);

export const ErrorNote = ({ message, onRetry }) => (
  <div className="rounded-xl bg-error-container text-on-error-container p-4 flex items-center justify-between gap-3 font-body-md">
    <span>{message}</span>
    {onRetry && <button onClick={onRetry} className="font-bold underline">Try again</button>}
  </div>
);

export const EmptyRow = ({ cols, text }) => (
  <tr><td colSpan={cols} className="px-4 py-12 text-center text-on-surface-variant font-body-md">{text}</td></tr>
);

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">{label}</span>
      {children}
      {hint && <span className="font-body-sm text-body-sm text-on-surface-variant">{hint}</span>}
    </label>
  );
}

// Tabs that switch between sibling pages (e.g. Loans | Fines)
export function SectionTabs({ tabs }) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-surface-container mb-6">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end
          className={({ isActive }) =>
            `px-4 py-2 rounded-lg font-label-md text-label-md font-bold transition-colors ${
              isActive ? "bg-primary-container text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}>
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}

// Centered dialog, or a right-hand side panel with side={true}
export function Modal({ title, subtitle, icon = "edit_note", onClose, children, footer, side = false, size = "max-w-2xl" }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-primary-container/60 backdrop-blur-sm flex ${side ? "justify-end" : "items-center justify-center p-4"}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true"
        className={`bg-surface-container-lowest shadow-2xl flex flex-col overflow-hidden ${
          side ? "w-full max-w-xl h-full" : `w-full ${size} max-h-[92vh] rounded-xl`}`}>
        <div className="bg-primary-container text-on-primary px-5 py-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-fixed flex items-center justify-center shrink-0">
              <Icon name={icon} className="text-[22px]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-headline-sm text-headline-sm font-bold truncate">{title}</h3>
              {subtitle && <p className="font-label-sm text-label-sm text-primary-fixed-dim truncate">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg text-on-primary-container hover:text-on-primary">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-4 bg-surface-container-low flex flex-wrap items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
