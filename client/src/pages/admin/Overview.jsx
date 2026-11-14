import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import Icon from "../../components/Icon";
import { kes } from "../../utils/format";

export default function Overview() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/dashboard").then((r) => setD(r.data)).catch(() => setError("Could not load the dashboard."));
  }, []);

  if (error) return <p className="text-error font-body-md">{error}</p>;
  if (!d) return <p className="text-on-surface-variant font-body-md">Loading dashboard…</p>;

  return (
    <div className="flex flex-col w-full">
      {/* Banner */}
      <section className="relative overflow-hidden rounded-xl bg-primary-container text-on-primary p-6 lg:p-8 shadow-md">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-secondary-container/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">
            <Icon name="shield_person" fill className="text-[15px]" /> Chairperson
          </span>
          <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight">Welcome, {user.name}</h1>
          <p className="font-body-md text-body-md text-primary-fixed-dim leading-relaxed">
            You approve member loans, record contributions and payouts, and manage the chama rules.
          </p>
          <p className="flex items-center gap-2 font-body-sm text-body-sm text-on-primary-container">
            <Icon name="group" className="text-[16px] text-tertiary-fixed" /> {d.members} active members
          </p>
        </div>
      </section>

      {/* KPI cards */}
      <section className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-2 rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-secondary/5 rounded-bl-full pointer-events-none" />
          <div>
            <span className="font-label-md text-label-md text-on-surface-variant font-bold">Total member savings</span>
            <div className="mt-3 font-currency-stat text-currency-stat font-extrabold text-secondary tracking-tight">{kes(d.totalSavings)}</div>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Monthly contributions recorded to date.</p>
          </div>
          <div className="mt-6 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-secondary" /> Investments: {kes(d.investmentsValue)}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary-container" /> Welfare: {kes(d.welfareBalance)}</span>
          </div>
        </div>

        <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant font-bold">Loans outstanding</span>
              <Icon name="account_balance" className="text-secondary text-[20px]" />
            </div>
            <div className="mt-3 font-headline-lg text-headline-lg font-bold text-primary-container">{kes(d.loansOutstanding)}</div>
            <div className="text-on-surface-variant font-body-sm text-body-sm mt-0.5">{d.activeLoans} active loans</div>
          </div>
          <Link to="/admin/loans" className="mt-4 p-3 rounded-lg bg-surface-container-low flex items-center justify-between hover:bg-surface-container">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Waiting for approval</span>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-extrabold">{d.pendingLoanRequests}</span>
          </Link>
        </div>

        <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant font-bold">Welfare fund</span>
              <Icon name="diversity_3" className="text-secondary text-[20px]" />
            </div>
            <div className="mt-3 font-headline-md text-headline-md font-bold text-primary-container">{kes(d.welfareBalance)}</div>
          </div>
          <div className="mt-4 flex items-center justify-between bg-error-container/60 px-3 py-2 rounded-lg">
            <span className="font-label-sm text-label-sm text-on-error-container font-semibold">Unpaid fines</span>
            <span className="font-label-md text-label-md font-bold text-on-error-container">{kes(d.unpaidFines)}</span>
          </div>
        </div>

        <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant font-bold">Expenses this year</span>
              <Icon name="receipt_long" className="text-secondary text-[20px]" />
            </div>
            <div className="mt-3 font-headline-md text-headline-md font-bold text-primary-container">{kes(d.expensesThisYear)}</div>
          </div>
          <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">Recorded under Expenses &amp; investments.</p>
        </div>
      </section>

      {/* Quick actions */}
      <section className="mt-8 bg-surface-container-lowest p-4 lg:p-5 rounded-xl shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon name="bolt" className="text-secondary text-[22px]" />
          <span className="font-label-lg text-label-lg font-bold text-on-surface">Quick actions</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Link to="/admin/contributions" className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-secondary text-on-secondary font-label-lg text-label-lg font-bold hover:bg-primary-container transition-colors">
            <Icon name="add_circle" className="text-[20px]" /> Record contribution
          </Link>
          <Link to="/admin/loans" className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold hover:bg-primary transition-colors">
            <Icon name="payments" className="text-[20px]" /> Review loans
          </Link>
          <Link to="/admin/meetings" className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-surface-container text-on-surface font-label-lg text-label-lg font-bold hover:bg-surface-container-high transition-colors">
            <Icon name="add_alarm" className="text-[20px]" /> Schedule meeting
          </Link>
        </div>
      </section>
    </div>
  );
}
