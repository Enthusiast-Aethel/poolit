import { useState } from "react";
import api from "../api/client";
import { Modal, Field, inputCls, btnPrimary, btnSecondary } from "./ui";
import { useToast } from "./Toast";
import { kes } from "../utils/format";
import { isoDate } from "../utils/dates";

export const FINE_REASONS = {
  late_contribution: "Late contribution",
  missed_meeting: "Missed meeting",
  late_repayment: "Late loan repayment",
  other: "Other",
};
const RULE_KEY = { late_contribution: "lateContribution", missed_meeting: "missedMeeting", late_repayment: "lateRepayment" };

// members = light list from GET /members, settings = GET /settings
export default function IssueFineModal({ members, settings, defaultMember = "", onClose, onSaved }) {
  const toast = useToast();
  const [member, setMember] = useState(defaultMember);
  const [reason, setReason] = useState("late_contribution");
  const [amount, setAmount] = useState("");
  const [base, setBase] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(isoDate());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const rule = settings?.fines?.[RULE_KEY[reason]];
  const hasRule = rule?.value > 0;
  const pct = hasRule && rule.mode === "percentage";
  const standard = hasRule ? (pct ? `${rule.value}% of the overdue amount` : kes(rule.value)) : null;

  const submit = async () => {
    setErr("");
    if (!member) return setErr("Choose the member being fined.");
    if (!amount && !hasRule) return setErr("No standard fine is set for this reason. Enter an amount.");
    if (!amount && pct && !base) return setErr("Enter the overdue amount the percentage applies to.");

    setSaving(true);
    try {
      await api.post("/fines", {
        member, reason, note, dateIssued: date,
        amount: amount ? Number(amount) : undefined,
        baseAmount: !amount && pct ? Number(base) : undefined,
      });
      toast("Fine issued");
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || "Could not issue the fine.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Issue a fine" subtitle="Penalty under the chama rules" icon="gavel" onClose={onClose} size="max-w-xl"
      footer={<>
        <button className={btnSecondary} onClick={onClose}>Cancel</button>
        <button className={btnPrimary} onClick={submit} disabled={saving}>{saving ? "Saving…" : "Issue fine"}</button>
      </>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Member" className="sm:col-span-2">
          <select className={inputCls} value={member} onChange={(e) => setMember(e.target.value)}>
            <option value="">Select a member…</option>
            {members.filter((m) => m.isActive).map((m) => (
              <option key={m._id} value={m._id}>{m.memberNo ? `#${m.memberNo} · ` : ""}{m.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Reason">
          <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
            {Object.entries(FINE_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Date issued">
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Amount (KES)" className={pct && !amount ? "" : "sm:col-span-2"}
          hint={standard ? `Leave blank to apply the standard fine (${standard}).` : "No standard fine is set for this reason, so enter an amount."}>
          <input type="number" min="1" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={rule?.mode === "flat" && hasRule ? String(rule.value) : ""} />
        </Field>
        {pct && !amount && (
          <Field label="Overdue amount (KES)" hint="The unpaid instalment or contribution.">
            <input type="number" min="1" className={inputCls} value={base} onChange={(e) => setBase(e.target.value)} />
          </Field>
        )}
        <Field label="Note (optional)" className="sm:col-span-2">
          <textarea rows={2} className={`${inputCls} h-auto py-2`} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      {err && <p role="alert" className="mt-4 p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">{err}</p>}
    </Modal>
  );
}
