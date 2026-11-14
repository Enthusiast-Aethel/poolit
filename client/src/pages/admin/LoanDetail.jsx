import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/client";
import useFetch from "../../hooks/useFetch";
import Icon from "../../components/Icon";
import { useToast } from "../../components/Toast";
import { StatCard, Pill, Modal, Field, Loading, ErrorNote, LoanStatusPill, inputCls, btnPrimary, btnNavy, btnSecondary, btnDanger, thCls, tdCls } from "../../components/ui";
import { kes } from "../../utils/format";
import { fullDate, isoDate } from "../../utils/dates";

const METHOD = { flat: "Flat rate", reducing: "Reducing balance" };
const INSTALMENT = { paid: ["good", "Paid"], partial: ["warn", "Part paid"], overdue: ["bad", "Overdue"], upcoming: ["neutral", "Upcoming"] };
const GUARANTOR = { accepted: ["good", "Accepted"], pending: ["warn", "Waiting"], declined: ["bad", "Declined"] };

export default function LoanDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/loans/${id}`);
  const [modal, setModal] = useState(null); // "repay" | "reject"
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  const loan = data?.loan;
  const s = data?.summary;

  // Before disbursement there is no schedule yet, so show what it will look like
  useEffect(() => {
    if (!loan || loan.schedule.length > 0 || !["pending", "approved"].includes(loan.status)) return;
    api.post("/loans/preview", { amount: loan.principal, termMonths: loan.termMonths, interestMethod: loan.interestMethod })
      .then((r) => setPreview(r.data.schedule.map((i) => ({ ...i, paid: 0, state: "upcoming" })))).catch(() => {});
  }, [loan]);

  const act = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      toast(okMsg);
      setModal(null);
      reload();
    } catch (e) {
      toast(e.response?.data?.message || "That did not work. Try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const lateFine = () => {
    const first = loan.schedule.find((i) => i.state === "overdue");
    if (!first) return;
    act(() => api.post("/fines", {
      member: loan.member._id, reason: "late_repayment", baseAmount: first.total - first.paid,
      dueDate: first.dueDate, note: `Loan ${loan.loanNo || ""} instalment ${first.no}`,
    }), "Late repayment fine issued");
  };

  if (loading && !data) return <Loading />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!loan) return null;

  const rows = loan.schedule.length ? loan.schedule : preview || [];
  const allAccepted = loan.guarantors.every((g) => g.status === "accepted");
  const status = s.displayStatus;

  return (
    <div>
      <Link to="/admin/loans" className="inline-flex items-center gap-1 font-label-md text-label-md font-bold text-secondary hover:underline mb-3">
        <Icon name="arrow_back" className="text-[18px]" /> All loans
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-headline-lg text-headline-lg font-bold text-primary-container tracking-tight">{loan.member.name}</h1>
            <LoanStatusPill status={status} />
          </div>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
            {loan.loanNo || "Loan"} · {METHOD[loan.interestMethod]} · {loan.interestRate}% a year · {loan.termMonths} months
            {loan.member.memberNo ? ` · Member #${loan.member.memberNo}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {loan.status === "pending" && <button className={btnNavy} disabled={busy || !allAccepted} onClick={() => act(() => api.patch(`/loans/${id}/approve`), "Loan approved")}><Icon name="check_circle" className="text-[20px]" /> Approve</button>}
          {loan.status === "approved" && <button className={btnPrimary} disabled={busy} onClick={() => act(() => api.patch(`/loans/${id}/disburse`, {}), "Loan disbursed")}><Icon name="payments" className="text-[20px]" /> Disburse</button>}
          {loan.status === "active" && <button className={btnPrimary} onClick={() => setModal("repay")}><Icon name="add_card" className="text-[20px]" /> Record repayment</button>}
          {loan.status === "active" && s.arrears > 0 && <button className={btnSecondary} disabled={busy} onClick={lateFine}><Icon name="gavel" className="text-[20px]" /> Issue late fine</button>}
          {["pending", "approved"].includes(loan.status) && <button className={btnDanger} onClick={() => setModal("reject")}><Icon name="cancel" className="text-[20px]" /> Reject</button>}
        </div>
      </div>

      {loan.status === "pending" && !allAccepted && (
        <p className="mb-6 p-3 rounded-lg bg-warning-container text-on-warning-container font-body-md text-body-md">
          Waiting for every guarantor to accept before this loan can be approved.
        </p>
      )}
      {loan.status === "rejected" && loan.rejectionReason && (
        <p className="mb-6 p-3 rounded-lg bg-error-container text-on-error-container font-body-md text-body-md">Rejected: {loan.rejectionReason}</p>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="request_quote" label="Amount borrowed" value={kes(loan.principal)} note={loan.disbursedOn ? `Disbursed ${fullDate(loan.disbursedOn)}` : "Not disbursed yet"} />
        <StatCard icon="account_balance_wallet" tone="gold" label="Balance owing" value={loan.totalPayable ? kes(s.balance) : "—"} note={loan.totalPayable ? `of ${kes(loan.totalPayable)} including interest` : "Set when disbursed"} />
        <StatCard icon="task_alt" label="Repayment progress" value={`${s.progress}%`} note={s.totalInstallments ? `${s.paidInstallments} of ${s.totalInstallments} instalments paid` : "—"} />
        <StatCard icon={s.arrears ? "warning" : "verified"} tone={s.arrears ? "bad" : "default"} label="Arrears" value={kes(s.arrears)}
          note={s.daysPastDue ? `${s.daysPastDue} days late` : status === "active" ? "On track" : "—"} />
      </section>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant/40 flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm font-bold text-primary-container">Repayment schedule</h2>
            {!loan.schedule.length && rows.length > 0 && <Pill tone="warn">Preview, starts on disbursement</Pill>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[640px]">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className={thCls}>#</th><th className={thCls}>Due date</th><th className={`${thCls} text-right`}>Principal</th>
                  <th className={`${thCls} text-right`}>Interest</th><th className={`${thCls} text-right`}>Instalment</th>
                  <th className={`${thCls} text-right`}>Paid</th><th className={thCls}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-on-surface-variant">No schedule yet.</td></tr>}
                {rows.map((i) => {
                  const [tone, label] = INSTALMENT[i.state] || INSTALMENT.upcoming;
                  return (
                    <tr key={i.no} className={i.state === "overdue" ? "bg-error-container/20" : ""}>
                      <td className={`${tdCls} font-mono`}>{i.no}</td>
                      <td className={tdCls}>{fullDate(i.dueDate)}</td>
                      <td className={`${tdCls} text-right`}>{kes(i.principal)}</td>
                      <td className={`${tdCls} text-right`}>{kes(i.interest)}</td>
                      <td className={`${tdCls} text-right font-bold`}>{kes(i.total)}</td>
                      <td className={`${tdCls} text-right`}>{i.paid ? kes(i.paid) : <span className="text-outline">—</span>}</td>
                      <td className={tdCls}><Pill tone={tone}>{label}</Pill></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section className="rounded-xl bg-surface-container-lowest shadow-sm p-5">
            <h2 className="font-headline-sm text-headline-sm font-bold text-primary-container mb-3">Guarantors</h2>
            {loan.guarantors.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant">Covered by the member's own savings. No guarantors needed.</p>
            ) : (
              <div className="divide-y divide-outline-variant/30">
                {loan.guarantors.map((g) => {
                  const [tone, label] = GUARANTOR[g.status];
                  return (
                    <div key={g._id} className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-label-lg text-label-lg font-bold">{g.member?.name}</div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">{g.member?.memberNo ? `#${g.member.memberNo}` : g.member?.phone}</div>
                      </div>
                      <Pill tone={tone}>{label}</Pill>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl bg-surface-container-lowest shadow-sm p-5">
            <h2 className="font-headline-sm text-headline-sm font-bold text-primary-container mb-3">Payments received</h2>
            {data.repayments.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant">No repayments recorded yet.</p>
            ) : (
              <div className="divide-y divide-outline-variant/30">
                {data.repayments.map((r) => (
                  <div key={r._id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-label-lg text-label-lg font-bold">{kes(r.amount)}</div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">{fullDate(r.paidOn)}{r.reference ? ` · ${r.reference}` : ""}</div>
                    </div>
                    <Icon name="check_circle" fill className="text-on-tertiary-fixed-variant" />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl bg-surface-container-low p-5 font-body-sm text-body-sm text-on-surface-variant flex flex-col gap-1">
            <div>Applied {fullDate(loan.createdAt)}</div>
            {loan.approvedBy && <div>Approved by {loan.approvedBy.name} on {fullDate(loan.approvedAt)}</div>}
            {loan.purpose && <div>Purpose: {loan.purpose}</div>}
          </section>
        </div>
      </div>

      {modal === "repay" && <RepayModal loan={loan} summary={s} busy={busy} onClose={() => setModal(null)}
        onSubmit={(body) => act(() => api.post(`/loans/${id}/repayments`, body), "Repayment recorded")} />}
      {modal === "reject" && <RejectModal busy={busy} onClose={() => setModal(null)}
        onSubmit={(reason) => act(() => api.patch(`/loans/${id}/reject`, { reason }), "Loan rejected")} />}
    </div>
  );
}

function RepayModal({ loan, summary, busy, onClose, onSubmit }) {
  const suggested = summary.arrears > 0 ? summary.arrears : summary.nextDue?.amount || summary.balance;
  const [amount, setAmount] = useState(String(suggested));
  const [paidOn, setPaidOn] = useState(isoDate());
  const [reference, setReference] = useState("");
  return (
    <Modal title="Record repayment" subtitle={`${loan.member.name} · balance ${kes(summary.balance)}`} icon="add_card" onClose={onClose} size="max-w-md"
      footer={<>
        <button className={btnSecondary} onClick={onClose}>Cancel</button>
        <button className={btnPrimary} disabled={busy || !(Number(amount) > 0)} onClick={() => onSubmit({ amount: Number(amount), paidOn, reference })}>
          {busy ? "Saving…" : "Record"}
        </button>
      </>}>
      <div className="flex flex-col gap-4">
        <Field label="Amount received (KES)" hint={summary.arrears > 0 ? `Arrears are ${kes(summary.arrears)}.` : summary.nextDue ? `Next instalment is ${kes(summary.nextDue.amount)}.` : ""}>
          <input type="number" min="1" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Date received"><input type="date" className={inputCls} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
        <Field label="M-Pesa code or reference" hint="Each code can only be recorded once.">
          <input className={`${inputCls} uppercase`} value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function RejectModal({ busy, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  return (
    <Modal title="Reject this loan" icon="cancel" onClose={onClose} size="max-w-md"
      footer={<>
        <button className={btnSecondary} onClick={onClose}>Cancel</button>
        <button className={btnDanger} disabled={busy || !reason.trim()} onClick={() => onSubmit(reason)}>{busy ? "Saving…" : "Reject loan"}</button>
      </>}>
      <Field label="Reason" hint="The member will see why.">
        <textarea rows={3} className={`${inputCls} h-auto py-2`} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </Modal>
  );
}
