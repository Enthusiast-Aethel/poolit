import { useState } from "react";
import { Link } from "react-router-dom";
import useFetch from "../../hooks/useFetch";
import Icon from "../../components/Icon";
import { Pill, Loading, ErrorNote } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { kes, MONTHS, shortDate } from "../../utils/format";
import { fullDate } from "../../utils/dates";
import { memberMonths } from "../../utils/months";

const TILE = {
  paid: ["bg-tertiary-fixed/40 text-on-tertiary-fixed-variant", "check_circle"],
  partial: ["bg-warning-container text-on-warning-container", "timelapse"],
  overdue: ["bg-error-container text-on-error-container", "error"],
  pending: ["bg-surface-container-high text-on-surface-variant", "schedule"],
  future: ["bg-surface-container-low text-outline", "hourglass_empty"],
  none: ["bg-surface-container-low text-outline-variant", "remove"],
};
const LABEL = { paid: "Paid", partial: "Part paid", overdue: "Overdue", pending: "Due soon", future: "Upcoming", none: "—" };

export default function MySavings() {
  const { user } = useAuth();
  const sav = useFetch("/my/savings");
  const divs = useFetch("/my/dividends");
  const settings = useFetch("/settings");
  const [filter, setFilter] = useState("all");

  if (sav.error) return <div className="p-4"><ErrorNote message={sav.error} onRetry={sav.reload} /></div>;
  if (!sav.data) return <Loading text="Loading your savings…" />;

  const s = sav.data;
  const year = new Date().getFullYear();
  const m = memberMonths({ contributions: s.contributions, monthlyAmount: s.monthlyAmount, dueDay: s.dueDay, joinDate: user?.joinDate, year });
  const st = s.standing;
  const typeNames = Object.keys(s.byType);
  const history = s.contributions.filter((c) => filter === "all" || c.type?.name === filter);

  return (
    <div className="px-margin-mobile flex flex-col gap-space-md pt-space-md pb-space-lg">
      <div>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-extrabold tracking-tight">My savings</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Everything you have contributed to the chama.</p>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-primary-container text-surface-bright p-5 shadow-xl">
        <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-secondary-container opacity-10 blur-2xl pointer-events-none" />
        <p className="font-label-md text-label-md text-secondary-fixed uppercase tracking-wider font-bold">Total savings</p>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-headline-sm text-headline-sm font-extrabold text-secondary-fixed">KES</span>
          <span className="font-currency-stat text-currency-stat font-extrabold tracking-tight">{Math.round(s.savings).toLocaleString("en-KE")}</span>
        </div>
        <div className="mt-4 rounded-xl bg-primary/60 p-3.5 flex items-center justify-between gap-3">
          <div>
            <p className="font-label-sm text-label-sm text-on-primary-container">Monthly contribution</p>
            <p className="font-label-lg text-label-lg font-bold">{kes(s.monthlyAmount)}</p>
          </div>
          <div className="text-right">
            <p className="font-label-sm text-label-sm text-on-primary-container">{st.paidThisMonth ? "This month" : "Next due"}</p>
            <p className="font-label-lg text-label-lg font-bold">{st.paidThisMonth ? "Paid" : fullDate(st.nextDue)}</p>
          </div>
        </div>
      </div>

      {settings.data?.paybill && (
        <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm flex items-start gap-3">
          <Icon name="phone_iphone" className="text-secondary mt-0.5" />
          <div>
            <p className="font-label-lg text-label-lg font-bold text-on-surface">How to pay</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Send your contribution by M-Pesa to Paybill <strong>{settings.data.paybill}</strong>
              {user?.memberNo ? <> and quote your member number <strong>{user.memberNo}</strong></> : null}. The chairperson records it once it is received, and it then appears below.
            </p>
          </div>
        </div>
      )}

      <section className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{year} monthly contributions</h3>
            <p className="font-label-sm text-label-sm text-on-surface-variant">{m.paidCount} of {m.dueCount} due months fully paid</p>
          </div>
          {m.dueCount > 0 && <Pill tone={m.paidCount === m.dueCount ? "good" : "warn"}>{Math.round((m.paidCount / m.dueCount) * 100)}%</Pill>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((mo, i) => {
            const [cls, icon] = TILE[m.states[i]];
            return (
              <div key={mo} className={`rounded-xl p-2.5 ${cls}`}>
                <div className="flex items-center justify-between"><span className="font-label-sm text-label-sm font-bold">{mo}</span><Icon name={icon} fill className="text-[16px]" /></div>
                <p className="mt-1 font-label-md text-label-md font-extrabold">{m.amounts[i] > 0 ? kes(m.amounts[i]) : "—"}</p>
                <p className="font-body-sm text-[11px]">{LABEL[m.states[i]]}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Payment history</h3>
          <Link to="/app/statement" className="inline-flex items-center gap-1 font-label-md text-label-md font-bold text-secondary"><Icon name="receipt_long" className="text-[18px]" /> Statement</Link>
        </div>
        {typeNames.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {["all", ...typeNames].map((k) => (
              <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm font-bold ${filter === k ? "bg-primary-container text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>
                {k === "all" ? "All" : k}
              </button>
            ))}
          </div>
        )}
        {history.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">No payments recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {history.map((c) => (
              <div key={c._id} className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-label-md text-label-md font-bold text-on-surface truncate">{c.type?.name}{c.month ? ` · ${MONTHS[c.month - 1]} ${c.year}` : ""}</p>
                  <p className="font-body-sm text-body-sm text-outline truncate">{shortDate(c.paidOn)}{c.reference ? ` · ${c.reference}` : ""}</p>
                </div>
                <span className="font-label-lg text-label-lg font-extrabold shrink-0">{kes(c.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {divs.data && divs.data.length > 0 && (
        <section className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-3">Dividends</h3>
          <div className="flex flex-col gap-2.5">
            {divs.data.map((d) => (
              <div key={d.year} className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-3">
                <div>
                  <p className="font-label-md text-label-md font-bold">{d.year} dividend</p>
                  <p className="font-body-sm text-body-sm text-outline">{(d.share * 100).toFixed(2)}% of the pool on savings of {kes(d.savings)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-label-lg text-label-lg font-extrabold">{kes(d.amount)}</p>
                  <Pill tone={d.paid ? "good" : "warn"}>{d.paid ? "Paid" : "To be paid"}</Pill>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
