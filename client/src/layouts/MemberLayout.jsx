import { NavLink, Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CHAMA_NAME } from "../config";
import Icon from "../components/Icon";

const NAV = [
  { to: "/app", label: "Home", icon: "dashboard", end: true },
  { to: "/app/savings", label: "Savings", icon: "savings" },
  { to: "/app/loans", label: "Loans", icon: "payments" },
  { to: "/app/welfare", label: "Welfare", icon: "shield_with_heart" },
  { to: "/app/statement", label: "Statement", icon: "receipt_long" },
];

export default function MemberLayout() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-margin-mobile flex items-center justify-between md:max-w-xl md:mx-auto">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
              <Icon name="account_balance" className="text-secondary-container text-[20px]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider truncate">{CHAMA_NAME}</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold leading-tight truncate">PoolIt</span>
            </div>
          </div>
          <div className="flex items-center gap-space-sm shrink-0">
            {isAdmin && (
              <Link to="/admin" className="px-3 py-1.5 rounded-full bg-primary-container text-surface-bright font-label-sm text-label-sm font-bold">
                Admin
              </Link>
            )}
            <button onClick={logout} aria-label="Sign out"
              className="w-11 h-11 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface active:bg-surface-container-high">
              <Icon name="logout" className="text-[22px]" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full pt-16 pb-24 md:max-w-xl md:mx-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_-1px_12px_rgba(11,31,58,0.06)]">
        <div className="h-16 px-space-xs flex items-center justify-around md:max-w-xl md:mx-auto">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full min-w-[44px] transition-colors ${isActive ? "text-secondary font-bold" : "text-on-surface-variant"}`}
            >
              <Icon name={n.icon} className="text-[24px]" />
              <span className="font-label-sm text-label-sm mt-0.5">{n.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}