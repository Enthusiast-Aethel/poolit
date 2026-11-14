import { useState } from "react";
import { Link } from "react-router-dom";
import useFetch from "../../hooks/useFetch";
import Icon from "../../components/Icon";
import { Loading, ErrorNote, inputCls } from "../../components/ui";
import { FINE_REASONS } from "../../components/IssueFineModal";
import { kes, MONTHS, initials } from "../../utils/format";
import { fullDate } from "../../utils/dates";
import { ROLE_LABEL } from "../../utils/labels";

const METHOD = { flat: "Flat rate", reducing: "Reducing balance" };
const STATUS = { pending: "Pending approval", approved: "Awaiting disbursement", active: "Active", overdue: "Overdue", cleared: "Cleared" };
const CHIP = {
  good: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  bad: "bg-error-container text-on-error-container",
  warn: "bg-warning-container text-on-warning-container",
  neutral: "bg-surface-container text-on-surface-variant",
};

export default function Statement() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const { data: d, loading, error, reload } = useFetch(`/my/statement?year=${year}`);

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* keep the green bands and tints when printed or saved as PDF */}
      <style>{`@media print { @page { size: A4; margin: 12mm; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } body { background: #fff !important; } .no-break { break-inside: avoid; } }`}</style>

      <div className="print:hidden sticky top-0 z-10 bg-surface-container-lowest/95 backdrop-blur shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/app" className="inline-flex items-center gap-1 font-label-md text-label-md font-bold text-secondary"><Icon name="arrow_back" className="text-[20px]" /> Back</Link>
          <div className="flex items-center gap-2">
            <select className={`${inputCls} w-auto h-10`} value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
              {[thisYear, thisYear - 1, thisYear - 2].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => window.print()} disabled={!d} className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-secondary-container text-on-secondary-container font-label-md text-label-md font-bold disabled:opacity-50">
              <Icon name="print" className="text-[20px]" /> Print or save as PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 print:p-0">
        {error && <ErrorNote message={error} onRetry={reload} />}
        {loading && !d && <Loading text="Preparing your statement…" />}
        {d && (
          <article className="bg-surface-container-lowest text-on-surface shadow-lg print:shadow-none rounded-2xl print:rounded-none overflow-hidden">
            {/* Brand band */}
            <header className="bg-primary-container text-on-primary px-6 md:px-10 py-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
              <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-secondary-container/15 pointer-events-none" />
              <div className="relative flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
                  <Icon name="account_balance" fill className="text-on-secondary-container text-[30px]" />
                </div>
                <div>
                  <h1 className="font-headline-md text-headline-md font-extrabold tracking-tight">{d.chama.name}</h1>
                  <p className="font-body-sm text-body-sm text-primary-fixed-dim">
                    {[d.chama.registrationNumber && `Reg. ${d.chama.registrationNumber}`, d.chama.address, d.chama.contactPhone, d.chama.contactEmail].filter(Boolean).join(" · ") || "Member statement"}
                  </p>
                </div>
              </div>
              <div className="relative sm:text-right">
                <p className="font-label-sm text-label-sm text-secondary-fixed uppercase tracking-wider font-bold">Statement of account</p>
                <p className="font-headline-md text-headline-md font-extrabold">Member statement {d.year}</p>
                <p className="font-body-sm text-body-sm text-primary-fixed-dim">1 Jan {d.year} to 31 Dec {d.year} · printed {fullDate(d.generatedAt)}</p>
              </div>
            </header>
            <div className="h-1.5 bg-gradient-to-r from-primary via-secondary-container to-primary-fixed" />

            <div className="p-6 md:p-10 flex flex-col gap-8">
              {/* Member */}
              <section className="no-break rounded-xl bg-primary-fixed p-5 flex flex-col sm:flex-row gap-5">
                <div className="w-16 h-16 rounded-full bg-primary-container text-secondary-fixed flex items-center justify-center font-headline-sm text-headline-sm font-extrabold shrink-0">{initials(d.member.name)}</div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-headline-sm text-headline-sm font-extrabold text-primary-container">{d.member.name}</h2>
                    {d.member.memberNo && <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold">#{d.member.memberNo}</span>}
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-on-primary-fixed-variant font-label-sm text-label-sm font-bold">{ROLE_LABEL[d.member.role]}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
                    {[["Phone", d.member.phone], ["Email", d.member.email || "—"], ["National ID", d.member.nationalId || "—"], ["Member since", fullDate(d.member.joinDate)]].map(([k, v]) => (
                      <div key={k}><p className="font-label-sm text-label-sm text-on-primary-fixed-variant/80">{k}</p><p className="font-body-md text-body-md font-semibold break-words">{v}</p></div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Summary */}
              <Block icon="insights" title="Summary">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ["Total savings", d.summary.savings, "border-secondary-container"],
                    [`Paid in during ${d.year}`, d.summary.contributedInYear, "border-accent-blue"],
                    ["Loans still owed", d.summary.owed, "border-accent-purple"],
                    ["Can borrow now", d.summary.available, "border-primary"],
                    ["Unpaid fines", d.summary.unpaidFines, "border-accent-red"],
                    [`Welfare paid in ${d.year}`, d.summary.welfareInYear, "border-accent-amber"],
                  ].map(([label, v, border]) => (
                    <div key={label} className={`no-break rounded-lg bg-surface-container-low border-l-4 ${border} px-4 py-3`}>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">{label}</p>
                      <p className="font-headline-sm text-headline-sm font-extrabold text-primary-container">{kes(v)}</p>
                    </div>
                  ))}
                </div>
              </Block>

              <Block icon="savings" title={`Contributions in ${d.year}`}>
                <Table head={["Date", "Type", "For", "Reference", "Amount"]} right={[4]} empty="No contributions recorded in this period."
                  rows={d.contributions.map((c) => [fullDate(c.paidOn), c.type?.name, c.month ? `${MONTHS[c.month - 1]} ${c.year}` : "—", c.reference || "—", kes(c.amount)])}
                  foot={d.contributions.length ? ["Total", "", "", "", kes(d.summary.contributedInYear)] : null} />
              </Block>

              <Block icon="payments" title="Loans">
                <Table head={["Loan", "Amount", "Terms", "Status", "Balance"]} right={[1, 4]} empty="You have no loans."
                  rows={d.loans.map((l) => [l.loanNo || "—", kes(l.principal), `${l.termMonths} months, ${METHOD[l.interestMethod]}, ${l.interestRate}% a year${l.disbursedOn ? `, from ${fullDate(l.disbursedOn)}` : ""}`,
                    <Chip key="s" tone={l.status === "overdue" ? "bad" : l.status === "cleared" ? "neutral" : l.status === "active" ? "good" : "warn"}>{STATUS[l.status] || l.status}</Chip>,
                    ["active", "overdue"].includes(l.status) ? kes(l.balance) : "—"])} />
                {d.repayments.length > 0 && (
                  <div className="mt-5">
                    <p className="font-label-md text-label-md font-bold text-primary-container mb-2">Repayments in {d.year}</p>
                    <Table head={["Date", "Loan", "Reference", "Amount"]} right={[3]} rows={d.repayments.map((r) => [fullDate(r.paidOn), r.loan?.loanNo || "—", r.reference || "—", kes(r.amount)])} />
                  </div>
                )}
              </Block>

              <Block icon="gavel" title={`Fines in ${d.year}`}>
                <Table head={["Date", "Reason", "Status", "Amount"]} right={[3]} empty="No fines in this period."
                  rows={d.fines.map((f) => [fullDate(f.dateIssued), FINE_REASONS[f.reason],
                    <Chip key="s" tone={f.status === "unpaid" ? "bad" : f.status === "paid" ? "good" : "neutral"}>{f.status === "unpaid" ? "Unpaid" : f.status === "paid" ? "Paid" : "Waived"}</Chip>, kes(f.amount)])} />
              </Block>

              {d.dividend && (
                <Block icon="trending_up" title={`Dividend for ${d.year}`}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[["Savings used", kes(d.dividend.savings)], ["Share of the pool", `${(d.dividend.share * 100).toFixed(2)}%`], ["Dividend", kes(d.dividend.amount)], ["Status", d.dividend.paid ? `Paid ${fullDate(d.dividend.paidOn)}` : "To be paid"]].map(([k, v]) => (
                      <div key={k} className="no-break rounded-lg bg-primary-fixed px-4 py-3"><p className="font-label-sm text-label-sm text-on-primary-fixed-variant/80">{k}</p><p className="font-label-lg text-label-lg font-extrabold text-primary-container">{v}</p></div>
                    ))}
                  </div>
                </Block>
              )}
            </div>

            <footer className="no-break bg-primary-fixed px-6 md:px-10 py-7 flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-10 pt-6">
                {["Chairperson", "Treasurer"].map((r) => (
                  <div key={r}><div className="border-b-2 border-primary-container h-10" /><p className="mt-1 font-label-sm text-label-sm text-on-primary-fixed-variant">{r}: name, signature and date</p></div>
                ))}
              </div>
              <p className="font-body-sm text-[11px] text-on-primary-fixed-variant">
                Produced from {d.chama.name}'s PoolIt records on {fullDate(d.generatedAt)}. It becomes an official copy only when signed by the chairperson and treasurer. The national ID number is partly hidden for your privacy.
              </p>
            </footer>
          </article>
        )}
      </div>
    </div>
  );
}

const Chip = ({ tone, children }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full font-label-sm text-[11px] font-bold ${CHIP[tone]}`}>{children}</span>
);

const Block = ({ icon, title, children }) => (
  <section className="no-break">
    <div className="flex items-center gap-2 pb-2 mb-3 border-b-2 border-primary-fixed">
      <span className="w-7 h-7 rounded-lg bg-primary-container text-secondary-fixed flex items-center justify-center"><Icon name={icon} className="text-[18px]" /></span>
      <h2 className="font-label-lg text-label-lg font-bold uppercase tracking-wider text-primary-container">{title}</h2>
    </div>
    {children}
  </section>
);

function Table({ head, rows, right = [], foot, empty }) {
  if (!rows.length && empty) return <p className="font-body-md text-body-md text-on-surface-variant">{empty}</p>;
  const align = (i) => (right.includes(i) ? "text-right" : "text-left");
  return (
    <div className="overflow-x-auto print:overflow-visible rounded-lg border border-outline-variant/40">
      <table className="w-full border-collapse font-body-sm text-body-sm">
        <thead><tr className="bg-primary-container text-on-primary">{head.map((h, i) => <th key={h} className={`px-3 py-2 font-label-sm text-label-sm font-bold ${align(i)}`}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="odd:bg-surface-container-lowest even:bg-surface-container-low no-break">{r.map((c, j) => <td key={j} className={`px-3 py-2 ${align(j)}`}>{c}</td>)}</tr>)}</tbody>
        {foot && <tfoot><tr className="bg-primary-fixed font-extrabold text-primary-container">{foot.map((c, j) => <td key={j} className={`px-3 py-2 ${align(j)}`}>{c}</td>)}</tr></tfoot>}
      </table>
    </div>
  );
}
