import { useEffect, useState } from "react";
import api from "../../api/client";
import useFetch from "../../hooks/useFetch";
import Icon from "../../components/Icon";
import { useToast } from "../../components/Toast";
import { Pill, Modal, Field, Loading, ErrorNote, LoanStatusPill, inputCls, btnPrimary, btnSecondary, btnDanger } from "../../components/ui";
import { kes } from "../../utils/format";
import { fullDate } from "../../utils/dates";

const METHOD = { flat: "Flat rate", reducing: "Reducing balance" };
const INSTALMENT = { paid: ["good", "Paid"], partial: ["warn", "Part paid"], overdue: ["bad", "Overdue"], upcoming: ["neutral", "Upcoming"] };
const G_STATUS = { accepted: ["good", "Accepted"], pending: ["warn", "Waiting"], declined: ["bad", "Declined"] };
const OPEN = ["pending", "approved", "active", "overdue"];

export default function MyLoans() {
  const toast = useToast();
  const loans = useFetch("/my/loans");
  const guar = useFetch("/my/guarantees");
  const elig = useFetch("/my/loan-eligibility");
  const [filter, setFilter] = useState("all");
  const [applying, setApplying] = useState(false);
  const [open, setOpen] = useState(null); // loan id with the schedule expanded

  const reloadAll = () => { loans.reload(); guar.reload(); elig.reload(); };

  const respond = async (g, status) => {
    try {
      await api.patch(`/loans/${g._id}/guarantee`, { status });
      toast(status === "accepted" ? "You have agreed to guarantee this loan" : "You declined the request");
      guar.reload();
    } catch (e) {
      toast(e.response?.data?.message || "Could not send your answer.", "error");
    }
  };

  if (loans.error) return <div className="p-4"><ErrorNote message={loans.error} onRetry={reloadAll} /></div>;
  if (!loans.data) return <Loading text="Loading your loans…" />;

  const requests = (guar.data || []).filter((g) => g.status === "pending" && g.myStatus === "pending");
  const pledged = (guar.data || []).filter((g) => g.myStatus === "accepted" && ["approved", "active"].includes(g.status));
  const list = loans.data.filter((l) => filter === "all" || (filter === "open" ? OPEN.includes(l.summary.displayStatus) : !OPEN.includes(l.summary.displayStatus)));
  const e = elig.data;

  return (
    <div className="px-margin-mobile flex flex-col gap-space-md pt-space-md pb-space-lg">
      <div>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-extrabold tracking-tight">My loans</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">What you owe, what you can borrow, and loans you stand guarantor for.</p>
      </div>

      {requests.length > 0 && (
        <section className="rounded-xl bg-warning-container p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2 text-on-warning-container"><Icon name="handshake" fill /><h3 className="font-headline-sm text-headline-sm font-bold">Guarantee requests</h3></div>
          {requests.map((g) => (
            <div key={g._id} className="rounded-xl bg-surface-container-lowest p-3.5">
              <p className="font-label-lg text-label-lg font-bold">{g.borrower?.name} asks you to guarantee {kes(g.principal)}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{g.termMonths} months · {METHOD[g.interestMethod]}. If they cannot repay, the chama may look to its guarantors.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className={btnPrimary} onClick={() => respond(g, "accepted")}>Agree</button>
                <button className={btnDanger} onClick={() => respond(g, "declined")}>Decline</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {e && (
        <section className="relative overflow-hidden rounded-xl bg-primary-container text-surface-bright p-5 shadow-xl">
          <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-secondary-container opacity-10 blur-2xl pointer-events-none" />
          <p className="font-label-md text-label-md text-secondary-fixed uppercase tracking-wider font-bold">You can borrow now</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-headline-sm text-headline-sm font-extrabold text-secondary-fixed">KES</span>
            <span className="font-currency-stat text-currency-stat font-extrabold tracking-tight">{Math.round(e.available).toLocaleString("en-KE")}</span>
          </div>
          <p className="mt-2 font-body-sm text-body-sm text-on-primary-container">{kes(e.savings)} savings x {e.limit && e.savings ? (e.limit / e.savings).toFixed(0) : 3} = {kes(e.limit)}, less {kes(e.outstanding)} you still owe.</p>
          <button className="mt-4 w-full h-12 rounded-xl bg-secondary-container text-on-secondary-container font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
            onClick={() => setApplying(true)} disabled={!(e.available > 0)}>
            <Icon name="add_circle" fill className="text-[20px]" /> Apply for a loan
          </button>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">My loans</h3>
          <div className="flex gap-2">
            {[["all", "All"], ["open", "Open"], ["done", "Settled"]].map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm font-bold ${filter === k ? "bg-primary-container text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>{label}</button>
            ))}
          </div>
        </div>
        {list.length === 0 && <p className="rounded-xl bg-surface-container-lowest p-4 font-body-md text-body-md text-on-surface-variant shadow-sm">{loans.data.length ? "Nothing in this list." : "You have not taken a loan yet."}</p>}
        {list.map((l) => <LoanCard key={l._id} loan={l} expanded={open === l._id} onToggle={() => setOpen(open === l._id ? null : l._id)} />)}
      </section>

      <section className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3"><Icon name="handshake" className="text-secondary" /><h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Loans I guarantee</h3></div>
        {pledged.length === 0 ? <p className="font-body-md text-body-md text-on-surface-variant">You are not guaranteeing any loan.</p> : (
          <div className="flex flex-col gap-2.5">
            {pledged.map((g) => (
              <div key={g._id} className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-label-md text-label-md font-bold truncate">{g.borrower?.name}{g.borrower?.memberNo ? ` #${g.borrower.memberNo}` : ""}</p>
                  <p className="font-body-sm text-body-sm text-outline">{g.loanNo || "Loan"} · {kes(g.principal)} · balance {kes(g.balance)}</p>
                </div>
                <LoanStatusPill status={g.displayStatus} />
              </div>
            ))}
          </div>
        )}
      </section>

      {applying && e && <ApplyModal elig={e} onClose={() => setApplying(false)} onSaved={() => { setApplying(false); reloadAll(); }} />}
    </div>
  );
}

function LoanCard({ loan: l, expanded, onToggle }) {
  const s = l.summary;
  const live = ["active", "overdue"].includes(s.displayStatus);
  const accepted = l.guarantors.filter((g) => g.status === "accepted").length;

  return (
    <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant">{l.loanNo || "Loan"}</p>
          <p className="font-headline-sm text-headline-sm font-bold text-primary-container">{kes(l.principal)}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{l.termMonths} months · {METHOD[l.interestMethod]} · {l.interestRate}% a year</p>
        </div>
        <LoanStatusPill status={s.displayStatus} />
      </div>

      {live && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-container-low p-3"><p className="font-label-sm text-label-sm text-on-surface-variant">Balance</p><p className="font-label-lg text-label-lg font-extrabold">{kes(s.balance)}</p></div>
            <div className={`rounded-xl p-3 ${s.arrears > 0 ? "bg-error-container text-on-error-container" : "bg-surface-container-low"}`}>
              <p className="font-label-sm text-label-sm">{s.arrears > 0 ? "Overdue now" : "Next payment"}</p>
              <p className="font-label-lg text-label-lg font-extrabold">{s.arrears > 0 ? kes(s.arrears) : s.nextDue ? kes(s.nextDue.amount) : "—"}</p>
              <p className="font-body-sm text-[11px]">{s.arrears > 0 ? `${s.daysPastDue} days late` : s.nextDue ? fullDate(s.nextDue.dueDate) : ""}</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mb-1"><span>{s.paidInstallments} of {s.totalInstallments} instalments paid</span><span>{s.progress}%</span></div>
            <div className="h-2 rounded-full bg-surface-container-high overflow-hidden"><div className="h-full rounded-full bg-on-tertiary-fixed-variant" style={{ width: `${s.progress}%` }} /></div>
          </div>
        </>
      )}

      {s.displayStatus === "pending" && (
        <div className="rounded-xl bg-surface-container-low p-3 font-body-sm text-body-sm text-on-surface-variant">
          <p className="font-label-md text-label-md font-bold text-on-surface mb-1">Waiting for approval</p>
          {l.guarantors.length === 0 ? "Covered by your own savings. The chairperson will review it." : (
            <>
              {accepted} of {l.guarantors.length} guarantors have agreed.
              <div className="mt-2 flex flex-wrap gap-2">{l.guarantors.map((g) => { const [tone, label] = G_STATUS[g.status]; return <Pill key={g._id} tone={tone}>{g.member?.name.split(" ")[0]}: {label}</Pill>; })}</div>
            </>
          )}
        </div>
      )}
      {s.displayStatus === "approved" && <p className="rounded-xl bg-surface-container-low p-3 font-body-sm text-body-sm text-on-surface-variant">Approved. The chairperson will disburse it shortly.</p>}
      {s.displayStatus === "rejected" && <p className="rounded-xl bg-error-container text-on-error-container p-3 font-body-sm text-body-sm">{l.rejectionReason ? `Reason: ${l.rejectionReason}` : "This application was not approved."}</p>}
      {s.displayStatus === "cleared" && <p className="rounded-xl bg-tertiary-fixed/30 text-on-tertiary-fixed-variant p-3 font-body-sm text-body-sm">Fully repaid. You paid {kes(l.totalPaid)} in total.</p>}

      {l.schedule.length > 0 && (
        <>
          <button onClick={onToggle} className="flex items-center justify-center gap-1 min-h-[44px] rounded-xl bg-surface-container font-label-md text-label-md font-bold text-on-surface-variant">
            {expanded ? "Hide schedule" : "Show repayment schedule"} <Icon name={expanded ? "expand_less" : "expand_more"} className="text-[20px]" />
          </button>
          {expanded && (
            <div className="divide-y divide-outline-variant/30">
              {l.schedule.map((i) => {
                const [tone, label] = INSTALMENT[i.state] || INSTALMENT.upcoming;
                return (
                  <div key={i.no} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3"><span className="font-mono font-bold text-on-surface-variant w-6">{String(i.no).padStart(2, "0")}</span>
                      <div><p className="font-label-md text-label-md font-bold">{fullDate(i.dueDate)}</p><p className="font-body-sm text-body-sm text-on-surface-variant">{kes(i.total)}{i.paid > 0 && i.paid < i.total ? ` (paid ${kes(i.paid)})` : ""}</p></div></div>
                    <Pill tone={tone}>{label}</Pill>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ApplyModal({ elig: base, onClose, onSaved }) {
  const toast = useToast();
  const options = useFetch("/members/guarantor-options");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("reducing");
  const [term, setTerm] = useState(3);
  const [purpose, setPurpose] = useState("");
  const [guarantors, setGuarantors] = useState([]);
  const [elig, setElig] = useState(base);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const amt = Number(amount) || 0;
  const known = amt > 0 && elig?.allowed;
  const maxTerm = known ? elig.maxTermMonths : 12;
  const needed = known ? elig.guarantorsRequired : 0;

  useEffect(() => {
    if (!(amt > 0)) { setElig(base); return; }
    const t = setTimeout(() => api.get("/my/loan-eligibility", { params: { amount: amt } }).then((r) => setElig(r.data)).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [amt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (term > maxTerm) setTerm(maxTerm); }, [maxTerm]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!(amt > 0) || !(term >= 1)) { setPreview(null); return; }
    const t = setTimeout(() => api.post("/loans/preview", { amount: amt, termMonths: term, interestMethod: method }).then((r) => setPreview(r.data)).catch(() => setPreview(null)), 250);
    return () => clearTimeout(t);
  }, [amt, term, method]);

  const toggle = (id) => setGuarantors((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  const canSend = known && preview && guarantors.length >= needed && !saving;

  const submit = async () => {
    setErr(""); setSaving(true);
    try {
      await api.post("/loans", { amount: amt, termMonths: term, interestMethod: method, purpose, guarantors });
      toast(needed ? "Application sent. Your guarantors have been asked to agree." : "Application sent to the chairperson.");
      onSaved();
    } catch (e) { setErr(e.response?.data?.message || "Could not send your application."); setSaving(false); }
  };

  return (
    <Modal title="Apply for a loan" subtitle={`You can borrow up to ${kes(base.available)}`} icon="request_quote" onClose={onClose} size="max-w-lg"
      footer={<><button className={btnSecondary} onClick={onClose}>Cancel</button><button className={btnPrimary} onClick={submit} disabled={!canSend}>{saving ? "Sending…" : "Send application"}</button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Amount (KES)"><input type="number" min="1" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        {amt > 0 && elig && !elig.allowed && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">{elig.reason}</p>}
        <Field label="Repayment period" hint={known ? `Up to ${maxTerm} months for this amount.` : ""}>
          <select className={inputCls} value={term} onChange={(e) => setTerm(Number(e.target.value))}>{Array.from({ length: maxTerm }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} month{n > 1 ? "s" : ""}</option>)}</select>
        </Field>
        <div>
          <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">Interest method</span>
          <div className="mt-1 grid grid-cols-2 gap-3">
            {[["reducing", "Reducing balance", "Interest falls as you repay"], ["flat", "Flat rate", "Interest on the full amount"]].map(([k, label, hint]) => (
              <button key={k} type="button" onClick={() => setMethod(k)} className={`text-left rounded-xl p-3 border-2 ${method === k ? "border-secondary bg-primary-fixed" : "border-outline-variant/50"}`}>
                <div className="font-label-md text-label-md font-bold">{label}</div><div className="font-body-sm text-body-sm text-on-surface-variant">{hint}</div>
              </button>
            ))}
          </div>
        </div>
        {preview && (
          <div className="grid grid-cols-3 gap-2">
            {[["Each month", preview.installment], ["Interest", preview.totalInterest], ["You repay", preview.totalPayable]].map(([label, v]) => (
              <div key={label} className="rounded-xl p-3 bg-surface-container-low"><p className="font-label-sm text-label-sm text-on-surface-variant font-bold">{label}</p><p className="font-label-md text-label-md font-extrabold text-primary-container">{kes(v)}</p></div>
            ))}
          </div>
        )}
        {known && (needed === 0 ? (
          <p className="p-3 rounded-lg bg-tertiary-fixed/30 text-on-tertiary-fixed-variant font-body-sm text-body-sm">No guarantors needed. This amount is covered by your own savings.</p>
        ) : (
          <div>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">Guarantors: choose {needed} ({guarantors.length} selected)</span>
            <div className="mt-1 max-h-44 overflow-y-auto rounded-xl bg-surface-container-low divide-y divide-outline-variant/30">
              {(options.data || []).map((m) => (
                <label key={m._id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-primary-container" checked={guarantors.includes(m._id)} onChange={() => toggle(m._id)} />
                  <span className="font-body-md text-body-md">{m.name}</span><span className="font-body-sm text-body-sm text-on-surface-variant">{m.memberNo ? `#${m.memberNo}` : ""}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <Field label="What is the loan for? (optional)"><input className={inputCls} value={purpose} onChange={(e) => setPurpose(e.target.value)} /></Field>
        {err && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">{err}</p>}
      </div>
    </Modal>
  );
}
