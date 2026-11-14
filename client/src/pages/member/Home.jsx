import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import Icon from "../../components/Icon";
import { kes, firstName, greeting, MONTHS, shortDate } from "../../utils/format";

export default function MemberHome() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/my/savings"),
      api.get("/my/loans"),
      api.get("/my/fines"),
      api.get("/my/loan-eligibility"),
      api.get("/settings"),
      api.get("/my/guarantees"),
    ])
      .then(([savings, loans, fines, elig, settings, guarantees]) =>
        setData({
          savings: savings.data, loans: loans.data, fines: fines.data,
          elig: elig.data, settings: settings.data, guarantees: guarantees.data,
        })
      )
      .catch(() => setError("Could not load your records. Check your connection and try again."));
  }, []);

  if (error) return <p className="p-4 text-error font-body-md">{error}</p>;
  if (!data) return <p className="p-4 text-on-surface-variant font-body-md">Loading your records…</p>;

  const { savings, loans, fines, elig, settings, guarantees } = data;

  // Arrears and due dates are worked out by the server so partial payments count correctly
  const status = { ...savings.standing, nextDue: new Date(savings.standing.nextDue) };
  const monthlyAmount = savings.monthlyAmount;

  const activeLoans = loans.filter((l) => ["active", "overdue"].includes(l.summary.displayStatus));
  const loanBalance = activeLoans.reduce((s, l) => s + l.summary.balance, 0);
  const unpaidFines = fines.filter((f) => f.status === "unpaid").reduce((s, f) => s + f.amount, 0);
  const goodStanding = status.unpaidMonths === 0 && unpaidFines === 0;
  const requests = guarantees.filter((g) => g.status === "pending" && g.myStatus === "pending").length;
  const recent = savings.contributions.slice(0, 5);
  const progress = status.dueMonths ? Math.round((status.paidMonths / status.dueMonths) * 100) : 100;

  return (
    <div className="px-margin-mobile flex flex-col gap-space-md pt-space-md pb-space-lg">
      {/* Welcome */}
      <div className="flex items-start justify-between gap-space-sm">
        <div className="min-w-0">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-extrabold tracking-tight truncate">
            {greeting()}, {firstName(user.name)}
          </h2>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {user.role !== "member" && (
              <span className="bg-primary-container text-surface-bright font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold capitalize">
                {user.role.replace("_", " ")}
              </span>
            )}
            {user.memberNo && <span className="text-on-surface-variant font-body-sm text-body-sm">#{user.memberNo}</span>}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full shadow-sm font-label-sm text-label-sm font-bold ${
          goodStanding ? "bg-surface-container-high text-on-tertiary-container" : "bg-error-container text-on-error-container"}`}>
          <Icon name={goodStanding ? "check_circle" : "warning"} fill className="text-[16px]" />
          {goodStanding ? "Paid up" : "Action needed"}
        </span>
      </div>

      {requests > 0 && (
        <Link to="/app/loans" className="rounded-xl bg-warning-container text-on-warning-container p-4 shadow-sm flex items-center gap-3">
          <Icon name="handshake" fill />
          <div className="flex-1"><p className="font-label-lg text-label-lg font-bold">{requests} guarantee request{requests > 1 ? "s" : ""} waiting</p><p className="font-body-sm text-body-sm">A member is asking you to guarantee their loan.</p></div>
          <Icon name="chevron_right" />
        </Link>
      )}

      {/* Hero: total savings */}
      <div className="relative overflow-hidden rounded-xl bg-primary-container text-surface-bright p-5 shadow-xl">
        <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-secondary-container opacity-10 blur-2xl pointer-events-none" />
        <p className="font-label-md text-label-md text-secondary-fixed uppercase tracking-wider font-bold">My total savings</p>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-headline-sm text-headline-sm font-extrabold text-secondary-fixed">KES</span>
          <span className="font-currency-stat text-currency-stat font-extrabold tracking-tight">
            {Math.round(savings.savings).toLocaleString("en-KE")}
          </span>
        </div>
        <p className="mt-2 font-body-sm text-body-sm text-on-primary-container">
          {status.paidMonths} of {status.dueMonths} monthly contributions paid this year
        </p>
        <Link to="/app/savings"
          className="mt-4 h-12 rounded-xl bg-secondary-container text-on-secondary-container font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          <Icon name="savings" fill className="text-[20px]" /> View my savings
        </Link>
      </div>

      {/* Next payment */}
      <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {status.paidThisMonth ? "This month is paid" : "Next payment due"}
            </h4>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Monthly contribution</p>
          </div>
          {!status.paidThisMonth && (
            <span className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm font-bold ${
              status.daysLeft < 0 ? "bg-error-container text-on-error-container" : "bg-warning-container text-on-warning-container"}`}>
              {status.daysLeft < 0 ? `${-status.daysLeft} days overdue` : status.daysLeft === 0 ? "Due today" : `In ${status.daysLeft} days`}
            </span>
          )}
        </div>
        <div className="bg-surface-container-low rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="font-label-sm text-label-sm text-outline">Amount</span>
            <div className="font-headline-md text-headline-md font-extrabold text-on-surface">{kes(monthlyAmount)}</div>
          </div>
          <div className="text-right">
            <span className="font-label-sm text-label-sm text-outline">Due date</span>
            <div className="font-label-lg text-label-lg font-bold text-on-surface">
              {status.nextDue.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      {/* Standing */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-label-md text-label-md text-on-surface font-bold">My standing</span>
          <span className={`font-label-sm text-label-sm font-bold flex items-center gap-1 ${goodStanding ? "text-on-tertiary-container" : "text-error"}`}>
            <span className={`w-2 h-2 rounded-full ${goodStanding ? "bg-on-tertiary-container" : "bg-error"}`} />
            {goodStanding ? "Good standing" : "Arrears or fines outstanding"}
          </span>
        </div>
        <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${goodStanding ? "bg-on-tertiary-container" : "bg-secondary-container"}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* 2x2 summary */}
      <div className="grid grid-cols-2 gap-space-sm">
        <Tile label="Active loan" icon="credit_card_off" value={kes(loanBalance)}
              note={activeLoans.length ? `${activeLoans.length} running` : "No active debt"} good={!activeLoans.length} to="/app/loans" />
        <Tile label="Can borrow now" icon="trending_up" value={kes(elig.available)} note={`${settings.loanMultiplier}x savings, less loans owed`} accent to="/app/loans" />
        <Tile label="My arrears" icon="verified" value={kes(status.arrears)}
              note={status.unpaidMonths ? `${status.unpaidMonths} month(s) unpaid` : "Zero arrears"} good={!status.unpaidMonths} to="/app/savings" />
        <Tile label="Fines" icon="gavel" value={kes(unpaidFines)} note={unpaidFines ? "Unpaid" : "No fines"} good={!unpaidFines} to="/app/welfare" />
      </div>

      {/* Recent contributions */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface">Recent contributions</h4>
          <Link to="/app/savings" className="font-label-md text-label-md text-secondary font-bold hover:underline">View all</Link>
        </div>
        {recent.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">No contributions recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {recent.map((c) => (
              <div key={c._id} className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between">
                <div className="min-w-0">
                  <span className="block font-label-md text-label-md text-on-surface font-bold truncate">
                    {c.type?.name}{c.month ? ` · ${MONTHS[c.month - 1]} ${c.year}` : ""}
                  </span>
                  <span className="block font-body-sm text-body-sm text-outline truncate">
                    {shortDate(c.paidOn)}{c.reference ? ` · ${c.reference}` : ""}
                  </span>
                </div>
                <span className="font-label-lg text-label-lg font-extrabold text-on-surface shrink-0">{kes(c.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
        You can only see your own records, {user.name}{user.memberNo ? ` (#${user.memberNo})` : ""}.
      </p>
    </div>
  );
}

function Tile({ label, icon, value, note, good, accent, to }) {
  return (
    <Link to={to} className="bg-surface-container-lowest rounded-xl p-3.5 shadow-sm flex flex-col justify-between active:scale-[0.98] transition-transform">
      <div className="flex items-center justify-between mb-2">
        <span className={`font-label-sm text-label-sm font-semibold ${accent ? "text-secondary" : "text-outline"}`}>{label}</span>
        <Icon name={icon} className={`text-[18px] ${accent ? "text-secondary" : "text-outline"}`} />
      </div>
      <div className={`font-headline-sm text-headline-sm font-bold ${accent ? "text-secondary" : "text-on-surface"}`}>{value}</div>
      <p className={`font-label-sm text-label-sm font-bold mt-0.5 ${good ? "text-on-tertiary-container" : "text-on-surface-variant"}`}>{note}</p>
    </Link>
  );
}
