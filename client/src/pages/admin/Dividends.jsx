import { useEffect, useState } from "react";
import api from "../../api/client";
import useFetch from "../../hooks/useFetch";
import Icon from "../../components/Icon";
import { useToast } from "../../components/Toast";
import { PageHeader, StatCard, Pill, Avatar, Field, Loading, ErrorNote, SectionTabs, inputCls, btnPrimary, btnSecondary, btnDanger, btnNavy, thCls, tdCls } from "../../components/ui";
import { kes } from "../../utils/format";
import { fullDate } from "../../utils/dates";
import { downloadCsv } from "../../utils/csv";

export const MONEY_TABS = [{ to: "/admin/dividends", label: "Surplus & dividends" }, { to: "/admin/dividends/finance", label: "Expenses & investments" }];
const money = (n) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;

export default function Dividends() {
  const toast = useToast();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear - 1 >= 2000 && new Date().getMonth() < 6 ? thisYear - 1 : thisYear);
  const preview = useFetch(`/dividends/surplus-preview?year=${year}`);
  const runs = useFetch("/dividends");
  const run = (runs.data || []).find((r) => r.year === year);
  const detail = useFetch(run ? `/dividends/${run._id}` : null, { skip: !run });
  const d = run ? detail.data : null;

  const [gross, setGross] = useState("");
  const [reservePct, setReservePct] = useState("0");
  const [deduct, setDeduct] = useState("0");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (preview.data && gross === "") setGross(String(Math.max(0, preview.data.suggestedSurplus))); }, [preview.data]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setGross(""); }, [year]);

  const reserve = money((Number(gross) || 0) * ((Number(reservePct) || 0) / 100));
  const pool = money((Number(gross) || 0) - reserve - (Number(deduct) || 0));
  const reload = () => { runs.reload(); detail.reload(); };

  const act = async (fn, msg) => {
    setBusy(true);
    try { await fn(); toast(msg); reload(); }
    catch (e) { toast(e.response?.data?.message || "That did not work. Try again.", "error"); }
    finally { setBusy(false); }
  };
  const calculate = () => act(() => api.post("/dividends", { year, grossSurplus: Number(gross), reservePercent: Number(reservePct) || 0, otherDeductions: Number(deduct) || 0 }), "Dividends calculated (draft)");
  const finalize = () => {
    if (!window.confirm(`Finalize ${year} dividends? The figures will be locked and can no longer be recalculated.`)) return;
    act(() => api.patch(`/dividends/${d._id}/finalize`), "Dividends finalized");
  };
  const discard = () => {
    if (!window.confirm("Discard this draft?")) return;
    act(() => api.delete(`/dividends/${d._id}`), "Draft discarded");
  };

  const p = preview.data;
  const paidTotal = d ? d.allocations.filter((a) => a.paid).reduce((s, a) => s + a.amount, 0) : 0;
  const rate = d && d.totalSavings ? ((d.distributableSurplus / d.totalSavings) * 100).toFixed(2) : null;

  const exportCsv = () =>
    downloadCsv(`dividends-${year}.csv`, d.allocations.map((a, i) => ({
      Rank: i + 1, "Member No": a.member?.memberNo || "", Member: a.member?.name, Savings: a.savings,
      "Share %": (a.share * 100).toFixed(2), Dividend: a.amount, Paid: a.paid ? "Yes" : "No",
    })));

  return (
    <div>
      <PageHeader
        eyebrow="Year end"
        title="Surplus & dividends"
        subtitle="Each member's dividend is the pool multiplied by their share of everyone's savings."
        actions={<select className={`${inputCls} w-auto`} value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
          {[thisYear, thisYear - 1, thisYear - 2].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>}
      />
      <SectionTabs tabs={MONEY_TABS} />

      {(preview.error || runs.error) && <ErrorNote message={preview.error || runs.error} onRetry={() => { preview.reload(); runs.reload(); }} />}
      {(preview.loading || runs.loading) && !p && <Loading />}

      {p && (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard icon="account_balance" label="Loan interest" value={kes(p.interestIncome)} note="Estimated from repayments" />
          <StatCard icon="gavel" label="Fines collected" value={kes(p.finesCollected)} />
          <StatCard icon="trending_up" label="Investment income" value={kes(p.investmentReturns)} />
          <StatCard icon="receipt_long" label="Expenses" value={`-${kes(p.expenses)}`} />
          <StatCard icon="calculate" tone="gold" label="Suggested surplus" value={kes(p.suggestedSurplus)} note="Income less expenses" />
        </section>
      )}

      {p && !(d?.status === "finalized") && (
        <section className="mt-6 rounded-xl bg-surface-container-lowest shadow-sm p-5">
          <h2 className="font-headline-sm text-headline-sm font-bold text-primary-container">Work out the pool for {year}</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Start from the suggested surplus, or type the figure your accountant gave you.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Surplus to be shared (KES)"><input type="number" min="0" className={inputCls} value={gross} onChange={(e) => setGross(e.target.value)} /></Field>
            <Field label="Keep as reserve (%)" hint={reserve ? `${kes(reserve)} kept back` : "Optional"}><input type="number" min="0" max="100" className={inputCls} value={reservePct} onChange={(e) => setReservePct(e.target.value)} /></Field>
            <Field label="Other deductions (KES)" hint="For example welfare top-up or AGM costs"><input type="number" min="0" className={inputCls} value={deduct} onChange={(e) => setDeduct(e.target.value)} /></Field>
          </div>
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-surface-container-low p-4">
            <div><p className="font-label-sm text-label-sm text-on-surface-variant font-bold">Pool shared among members</p><p className="font-headline-md text-headline-md font-bold text-primary-container">{kes(pool)}</p></div>
            <button className={btnPrimary} onClick={calculate} disabled={busy || !(pool > 0)}><Icon name="calculate" className="text-[20px]" /> {d ? "Recalculate" : "Calculate dividends"}</button>
          </div>
        </section>
      )}

      {d && (
        <section className="mt-6 rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-headline-sm text-headline-sm font-bold text-primary-container">Member dividends, {d.year}</h2>
              <Pill tone={d.status === "finalized" ? "good" : "warn"}>{d.status === "finalized" ? `Finalized ${fullDate(d.finalizedAt)}` : "Draft, not final"}</Pill>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={btnSecondary} onClick={exportCsv}><Icon name="download" className="text-[20px]" /> Export</button>
              {d.status === "draft" && <button className={btnDanger} onClick={discard} disabled={busy}>Discard draft</button>}
              {d.status === "draft" && <button className={btnNavy} onClick={finalize} disabled={busy}><Icon name="lock" className="text-[20px]" /> Finalize</button>}
            </div>
          </div>
          <div className="px-5 py-3 bg-surface-container-low grid grid-cols-2 lg:grid-cols-5 gap-4 font-body-sm text-body-sm">
            <Fact label="Pool" value={kes(d.distributableSurplus)} />
            <Fact label="Savings base" value={kes(d.totalSavings)} />
            <Fact label="Dividend rate" value={rate ? `${rate}%` : "—"} />
            <Fact label="Reserve kept" value={d.reserveAmount ? kes(d.reserveAmount) : "—"} />
            <Fact label="Paid out" value={`${kes(paidTotal)}`} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[720px]">
              <thead className="bg-surface-container-low"><tr>
                <th className={thCls}>#</th><th className={thCls}>Member</th><th className={`${thCls} text-right`}>Savings</th>
                <th className={`${thCls} text-right`}>Share</th><th className={`${thCls} text-right`}>Dividend</th><th className={thCls}>Status</th><th className={thCls} />
              </tr></thead>
              <tbody className="divide-y divide-outline-variant/30">
                {d.allocations.map((a, i) => (
                  <tr key={a._id} className="hover:bg-surface-container-low">
                    <td className={`${tdCls} font-mono text-on-surface-variant`}>{i + 1}</td>
                    <td className={tdCls}><div className="flex items-center gap-3"><Avatar name={a.member?.name} size="w-8 h-8" /><div><div className="font-label-lg text-label-lg font-bold">{a.member?.name}</div><div className="font-body-sm text-body-sm text-on-surface-variant">{a.member?.memberNo ? `#${a.member.memberNo}` : ""}</div></div></div></td>
                    <td className={`${tdCls} text-right`}>{kes(a.savings)}</td>
                    <td className={`${tdCls} text-right`}>{(a.share * 100).toFixed(2)}%</td>
                    <td className={`${tdCls} text-right font-bold`}>{kes(a.amount)}</td>
                    <td className={tdCls}>{a.paid ? <Pill tone="good">Paid {fullDate(a.paidOn)}</Pill> : <Pill tone={d.status === "finalized" ? "warn" : "neutral"}>{d.status === "finalized" ? "To pay" : "Draft"}</Pill>}</td>
                    <td className={`${tdCls} text-right`}>
                      {d.status === "finalized" && (
                        <button disabled={busy} onClick={() => act(() => api.patch(`/dividends/${d._id}/pay/${a.member._id}`), a.paid ? "Marked unpaid" : "Marked as paid")}
                          className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md font-bold hover:bg-surface-container-high">{a.paid ? "Undo" : "Mark paid"}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 font-body-sm text-body-sm text-on-surface-variant border-t border-outline-variant/40">
            Only active members with savings up to the end of {d.year} are included. Amounts are rounded down to the cent{d.unallocated > 0 ? `, leaving ${kes(d.unallocated)} unallocated.` : "."}
          </p>
        </section>
      )}
    </div>
  );
}

const Fact = ({ label, value }) => (<div><p className="text-on-surface-variant">{label}</p><p className="font-label-lg text-label-lg font-bold text-primary-container">{value}</p></div>);
