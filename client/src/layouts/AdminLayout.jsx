import { NavLink, Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { APP_NAME, CHAMA_NAME } from "../config";
import { initials } from "../utils/format";
import Icon from "../components/Icon";

const NAV = [
  { to: "/admin", label: "Overview", icon: "grid_view", end: true },
  { to: "/admin/contributions", label: "Contributions", icon: "account_balance_wallet", short: "Savings" },
  { to: "/admin/loans", label: "Loans & Fines", icon: "payments", short: "Loans" },
  { to: "/admin/welfare", label: "Welfare & Chama Pool", icon: "diversity_3", mobile: false },
  { to: "/admin/meetings", label: "Meetings", icon: "event_available", mobile: false },
  { to: "/admin/members", label: "Members", icon: "group" },
  { to: "/admin/messages", label: "Messages (SMS)", icon: "sms", short: "SMS" },
  { to: "/admin/dividends", label: "Dividends", icon: "trending_up", mobile: false },
  { to: "/admin/settings", label: "Settings", icon: "settings" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-primary-container z-50 shadow-[0_1px_8px_rgba(0,0,0,0.12)]">
        <div className="h-full px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center">
              <Icon name="account_balance" fill className="text-on-secondary-container" />
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-primary font-bold tracking-tight leading-tight">{APP_NAME}</span>
              <span className="font-label-sm text-label-sm text-secondary-fixed font-semibold tracking-wider uppercase opacity-90">{CHAMA_NAME}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-5">
            {/* Admin / Member view switch */}
            <div className="hidden sm:flex items-center bg-primary rounded-full p-1 border border-outline/20">
              <span className="px-3 py-1.5 rounded-full font-label-sm text-label-sm font-bold bg-secondary-container text-on-secondary-container">Admin View</span>
              <Link to="/app" className="px-3 py-1.5 rounded-full font-label-sm text-label-sm font-semibold text-on-primary hover:bg-surface-container-lowest/10">
                Member View
              </Link>
            </div>

            <div className="flex items-center gap-3 bg-primary/40 px-3 py-2 rounded-xl border border-outline/20">
              <div className="hidden md:flex flex-col text-right">
                <span className="font-label-lg text-label-lg text-on-primary font-bold leading-tight">{user.name}</span>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className="px-1.5 py-0.5 rounded font-label-sm text-label-sm font-bold bg-secondary-container text-on-secondary-container leading-none uppercase">Chairperson</span>
                  {user.memberNo && <span className="font-body-sm text-body-sm text-primary-fixed-dim">#{user.memberNo}</span>}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-sm text-label-sm font-bold">
                {initials(user.name)}
              </div>
              <button onClick={logout} aria-label="Sign out" className="text-on-primary-container hover:text-on-primary">
                <Icon name="logout" className="text-[20px]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex fixed left-0 top-20 bottom-0 w-64 bg-primary-container z-40 flex-col py-6 overflow-y-auto border-t border-outline/10">
        <p className="px-6 mb-4 font-label-sm text-label-sm uppercase text-on-primary-container tracking-wider font-bold">Operations &amp; Ledgers</p>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-surface-container-lowest/10 text-secondary-fixed border-l-4 border-secondary-container font-bold"
                    : "text-on-primary-container hover:bg-surface-container-lowest/5 hover:text-on-primary"
                }`}
            >
              <Icon name={n.icon} className="text-[20px]" />
              <span className="font-label-lg text-label-lg">{n.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Bottom nav (mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-container-lowest border-t border-outline-variant/30 z-50 flex items-center justify-around px-2 pb-safe">
        {NAV.filter((n) => n.mobile !== false).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[48px] min-h-[48px] ${isActive ? "text-secondary" : "text-on-surface-variant hover:text-on-surface"}`}
          >
            <Icon name={n.icon} className="text-[22px]" />
            <span className="font-label-sm text-[10px] mt-0.5">{n.short || n.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="lg:pl-64">
        <main className="pt-20 pb-20 lg:pb-12 min-h-screen px-4 lg:px-8">
          <div className="pt-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
