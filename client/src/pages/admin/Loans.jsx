import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import useFetch from "../../hooks/useFetch";
import Icon from "../../components/Icon";
import { useToast } from "../../components/Toast";
import {
  PageHeader, StatCard, Modal, Field, Loading, ErrorNote, EmptyRow, SectionTabs, LoanStatusPill, Avatar,
  inputCls, btnPrimary, btnSecondary, thCls, tdCls,
} from "../../components/ui";
import { kes } from "../../utils/format";
import { fullDate } from "../../utils/dates";
import { downloadCsv } from "../../utils/csv";

export const LOAN_TABS = [{ to: "/admin/loans", label: "Loans register" }, { to: "/admin/loans/fines", label: "Fines & penalties" }];
const METHOD = { flat: "Flat rate", reducing: "Reducing balance" };

export default function Loans() {
  const { data, loading, error, reload } = useFetch("/loans");
  const members = useFetch("/members");
  const interest = useFetch(`/dividends/surplus-preview?year=${new Date().getFullYear()}`);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const loans = data || [];
  const stat = (l) => l.summary.displayStatus;

  const kpi = useMemo(() => {
    const live = loans.filter((l) => ["active", "overdue"].includes(stat(l)));
    return {
      advances: live.reduce((s, l) => s + l.principal, 0),
      liveCount: live.length,
      dueThisMonth: live.reduce((s, l) => s + l.summary.dueThisMonth, 0),
      atRisk: live.filter((l) => l.summary.daysPastDue > 30).reduce((s, l) => s + l.summary.balance, 0),
      overdueCount: live.filter((l) => stat(l) === "overdue").length,
    };
  }, [loans]);

  const counts = {
    all: loans.length,
    pending: loans.filter((l) => ["pending", "approved"].includes(stat(l))).length,
    active: loans.filter((l) => stat(l) === "active").length,
    overdue: loans.filter((l) => stat(l) === "overdue").length,
    cleared: loans.filter((l) => stat(l) === "cleared").length,
  };
  const FILTERS = [["all", "All"], ["pending", "Needs action"], ["active", "Active"], ["overdue", "Overdue"], ["cleared", "Cleared"]];

  const visible = loans.filter((l) => {
    const q = query.trim().toLowerCase();
    const hit = !q || l.member?.name.toLowerCase().includes(q) || (l.loanNo || "").toLowerCase().includes(q);
    const s = stat(l);
    return hit && (filter === "all" || (filter === "pending" ? ["pending", "approved"].includes(s) : s === filter));
  });

  const exportCsv = () =>
    downloadCsv("loans.csv", visible.map((l) => ({
      "Loan no": l.loanNo || l._id, Borrower: l.member?.name, Principal: l.principal, Method: METHOD[l.interestMethod],
      "Rate % p.a.": l.interestRate, Months: l.termMonths, Status: l.summary.displayStatus,
      Balance: l.summary.balance, Arrears: l.summary.arrears, "Days past due": l.summary.daysPastDue,
    })));

  return (
    <div>
      <PageHeader
        eyebrow="Lending"
        title="Loans & penalties"
        subtitle="Every loan, its guarantors and where it stands. Open a loan to approve it, record repayments or see its schedule."
        actions={<>
          <button className={btnSecondary} onClick={exportCsv}><Icon name="download" className="text-[20px]" /> Export</button>
          <button className={btnPrimary} onClick={() => setCreating(true)}><Icon name="add" className="text-[20px]" /> New loan</button>
        </>}
      />
      <SectionTabs tabs={LOAN_TABS} />

      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}

      {data && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon="account_balance" label="Loans given out" value={kes(kpi.advances)} note={`${kpi.liveCount} running loans`} />
            <StatCard icon="event" tone="gold" label="Still to collect this month" value={kes(kpi.dueThisMonth)} note="Instalments due this month, unpaid" />
            <StatCard icon="warning" tone={kpi.atRisk ? "bad" : "default"} label="At risk (over 30 days late)" value={kes(kpi.atRisk)} note={`${kpi.overdueCount} loan(s) overdue`} />
            <StatCard icon="trending_up" label="Interest earned this year" value={interest.data ? kes(interest.data.interestIncome) : "—"} note="Estimated from repayments received" />
          </section>

          <section className="mt-6 rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
            <div className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between border-b border-outline-variant/40">
              <div className="relative w-full lg:max-w-sm">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                <input className={`${inputCls} pl-10`} placeholder="Search borrower or loan number" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map(([k, label]) => (
                  <button key={k} onClick={() => setFilter(k)}
                    className={`px-3.5 py-2 rounded-full font-label-md text-label-md font-bold ${filter === k ? "bg-primary-container text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>
                    {label} <span className="opacity-70">{counts[k]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[1100px]">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className={thCls}>Loan</th><th className={thCls}>Borrower</th><th className={`${thCls} text-right`}>Amount</th>
                    <th className={thCls}>Terms</th><th className={thCls}>Next due</th><th className={`${thCls} text-right`}>Balance</th>
                    <th className={thCls}>Guarantors</th><th className={thCls}>Status</th><th className={thCls} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {visible.length === 0 && <EmptyRow cols={9} text="No loans match." />}
                  {visible.map((l) => {
                    const s = l.summary;
                    const accepted = l.guarantors.filter((g) => g.status === "accepted").length;
                    return (
                      <tr key={l._id} className="hover:bg-surface-container-low transition-colors">
                        <td className={`${tdCls} font-mono text-on-surface-variant`}>{l.loanNo || l._id.slice(-6)}</td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-3">
                            <Avatar name={l.member?.name} size="w-9 h-9" />
                            <div>
                              <div className="font-label-lg text-label-lg font-bold">{l.member?.name}</div>
                              <div className="font-body-sm text-body-sm text-on-surface-variant">{l.member?.memberNo ? `#${l.member.memberNo}` : ""}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`${tdCls} text-right`}>
                          <div className="font-bold">{kes(l.principal)}</div>
                          <div className="font-body-sm text-body-sm text-on-surface-variant">{l.disbursedOn ? fullDate(l.disbursedOn) : "Not disbursed"}</div>
                        </td>
                        <td className={tdCls}>
                          <div className="font-label-md text-label-md font-bold">{METHOD[l.interestMethod]}</div>
                          <div className="font-body-sm text-body-sm text-on-surface-variant">{l.termMonths} months at {l.interestRate}% a year</div>
                        </td>
                        <td className={tdCls}>
                          {s.nextDue ? (
                            <>
                              <div className="font-label-md text-label-md font-bold">{fullDate(s.nextDue.dueDate)}</div>
                              <div className={`font-body-sm text-body-sm ${s.daysPastDue ? "text-error font-bold" : "text-on-surface-variant"}`}>
                                {s.daysPastDue ? `${s.daysPastDue} days late` : kes(s.nextDue.amount)}
                              </div>
                            </>
                          ) : <span className="text-outline">—</span>}
                        </td>
                        <td className={`${tdCls} text-right font-bold`}>{["active", "overdue"].includes(s.displayStatus) ? kes(s.balance) : <span className="text-outline">—</span>}</td>
                        <td className={tdCls}>
                          {l.guarantors.length === 0 ? (
                            <span className="font-body-sm text-body-sm text-on-surface-variant">Own savings</span>
                          ) : (
                            <div>
                              <div className="font-label-md text-label-md font-bold">{accepted} of {l.guarantors.length} accepted</div>
                              <div className="font-body-sm text-body-sm text-on-surface-variant">{l.guarantors.map((g) => g.member?.name.split(" ")[0]).join(", ")}</div>
                            </div>
                          )}
                        </td>
                        <td className={tdCls}><LoanStatusPill status={s.displayStatus} /></td>
                        <td className={tdCls}>
                          <Link to={`/admin/loans/${l._id}`} className="inline-flex items-center gap-1 font-label-md text-label-md font-bold text-secondary hover:underline">
                            {["pending", "approved"].includes(s.displayStatus) ? "Review" : "Open"} <Icon name="chevron_right" className="text-[18px]" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {creating && members.data && (
        <NewLoanModal members={members.data} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); interest.reload(); }} />
      )}
    </div>
  );
}

/* ---------- record, approve and disburse a loan for a member ---------- */
function NewLoanModal({ members, onClose, onSaved }) {
  const toast = useToast();
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("reducing");
  const [term, setTerm] = useState(3);
  const [guarantors, setGuarantors] = useState([]);
  const [elig, setElig] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const amt = Number(amount) || 0;
  const known = amt > 0 && elig?.allowed;
  const maxTerm = known ? elig.maxTermMonths : 12;
  const needed = known ? elig.guarantorsRequired : 0;

  // What can this member borrow right now?
  useEffect(() => {
    if (!memberId) { setElig(null); return; }
    const t = setTimeout(() => {
      api.get(`/members/${memberId}/eligibility`, { params: { amount: amt } })
        .then((r) => setElig(r.data)).catch(() => setElig(null));
    }, 250);
    return () => clearTimeout(t);
  }, [memberId, amt]);

  useEffect(() => { if (term > maxTerm) setTerm(maxTerm); }, [maxTerm]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setGuarantors((g) => g.filter((id) => id !== memberId)); }, [memberId]);

  // Live repayment preview from the server (same maths used when the loan is created)
  useEffect(() => {
    if (!(amt > 0) || !(term >= 1)) { setPreview(null); return; }
    const t = setTimeout(() => {
      api.post("/loans/preview", { amount: amt, termMonths: term, interestMethod: method })
        .then((r) => setPreview(r.data)).catch(() => setPreview(null));
    }, 250);
    return () => clearTimeout(t);
  }, [amt, term, method]);

  const toggleG = (id) => setGuarantors((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  const canSave = memberId && known && preview && guarantors.length >= needed && !saving;

  const submit = async () => {
    setErr("");
    setSaving(true);
    try {
      await api.post("/loans", { member: memberId, amount: amt, termMonths: term, interestMethod: method, guarantors, disburseNow: true });
      toast("Loan approved and disbursed");
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || "Could not create the loan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="New loan" subtitle="Records, approves and disburses it in one step" icon="request_quote" onClose={onClose} size="max-w-3xl"
      footer={<>
        <button className={btnSecondary} onClick={onClose}>Cancel</button>
        <button className={btnPrimary} onClick={submit} disabled={!canSave}>{saving ? "Saving…" : "Approve and disburse"}</button>
      </>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Borrower" className="md:col-span-2">
          <select className={inputCls} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">Select a member…</option>
            {members.filter((m) => m.isActive).map((m) => <option key={m._id} value={m._id}>{m.memberNo ? `#${m.memberNo} · ` : ""}{m.name}</option>)}
          </select>
        </Field>

        {elig && (
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[["Savings", elig.savings], ["Borrowing limit", elig.limit], ["Still owed", elig.outstanding], ["Can borrow now", elig.available]].map(([label, v], i) => (
              <div key={label} className={`rounded-xl p-3 ${i === 3 ? "bg-primary-fixed" : "bg-surface-container-low"}`}>
                <p className="font-label-sm text-label-sm text-on-surface-variant font-bold">{label}</p>
                <p className="font-label-lg text-label-lg font-bold text-primary-container">{kes(v)}</p>
              </div>
            ))}
          </div>
        )}

        <Field label="Amount (KES)"><input type="number" min="1" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Repayment period" hint={known ? `Up to ${maxTerm} months for this amount.` : ""}>
          <select className={inputCls} value={term} onChange={(e) => setTerm(Number(e.target.value))}>
            {Array.from({ length: maxTerm }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} month{n > 1 ? "s" : ""}</option>)}
          </select>
        </Field>

        <div className="md:col-span-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">Interest method</span>
          <div className="mt-1 grid grid-cols-2 gap-3">
            {[["reducing", "Reducing balance", "Interest falls as the loan is repaid"], ["flat", "Flat rate", "Interest on the full amount"]].map(([k, label, hint]) => (
              <button key={k} type="button" onClick={() => setMethod(k)}
                className={`text-left rounded-xl p-3 border-2 transition-colors ${method === k ? "border-secondary bg-primary-fixed" : "border-outline-variant/50 hover:border-outline"}`}>
                <div className="font-label-md text-label-md font-bold">{label}</div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">{hint}</div>
              </button>
            ))}
          </div>
        </div>

        {elig && amt > 0 && !elig.allowed && (
          <p role="alert" className="md:col-span-2 p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">{elig.reason}</p>
        )}

        {preview && (
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[["Monthly instalment", preview.installment], ["Total interest", preview.totalInterest], ["Total to repay", preview.totalPayable]].map(([label, v]) => (
              <div key={label} className="rounded-xl p-3 bg-surface-container-low">
                <p className="font-label-sm text-label-sm text-on-surface-variant font-bold">{label}</p>
                <p className="font-label-lg text-label-lg font-bold text-primary-container">{kes(v)}</p>
              </div>
            ))}
            <div className="rounded-xl p-3 bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant font-bold">Final instalment</p>
              <p className="font-label-lg text-label-lg font-bold text-primary-container">{fullDate(preview.maturity)}</p>
            </div>
          </div>
        )}

        {known && (
          <div className="md:col-span-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">Guarantors</span>
            {needed === 0 ? (
              <p className="mt-1 p-3 rounded-lg bg-tertiary-fixed/30 text-on-tertiary-fixed-variant font-body-sm text-body-sm">
                No guarantors needed. This amount is covered by the member's own savings.
              </p>
            ) : (
              <>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Choose {needed} active members ({guarantors.length} selected).</p>
                <div className="mt-1 max-h-44 overflow-y-auto rounded-xl bg-surface-container-low divide-y divide-outline-variant/30">
                  {members.filter((m) => m.isActive && m._id !== memberId).map((m) => (
                    <label key={m._id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-container">
                      <input type="checkbox" checked={guarantors.includes(m._id)} onChange={() => toggleG(m._id)} className="w-4 h-4 accent-primary-container" />
                      <span className="font-body-md text-body-md">{m.name}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">{m.memberNo ? `#${m.memberNo}` : ""}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {err && <p role="alert" className="mt-4 p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">{err}</p>}
    </Modal>
  );
}
