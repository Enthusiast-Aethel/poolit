import { useState } from "react";
import api from "../../api/client";
import useFetch from "../../hooks/useFetch";
import Icon from "../../components/Icon";
import { useToast } from "../../components/Toast";
import { Pill, Modal, Field, Loading, ErrorNote, inputCls, btnPrimary, btnSecondary } from "../../components/ui";
import { FINE_REASONS } from "../../components/IssueFineModal";
import { useAuth } from "../../context/AuthContext";
import { kes } from "../../utils/format";
import { fullDate } from "../../utils/dates";

const FINE_STATUS = { unpaid: ["bad", "Unpaid"], paid: ["good", "Paid"], waived: ["neutral", "Waived"] };
const CLAIM_STATUS = { pending: ["warn", "Under review"], paid: ["good", "Paid"], rejected: ["neutral", "Not approved"] };
const ATT = { present: ["good", "Present"], apology: ["warn", "Apology"], absent: ["bad", "Absent"] };
const RELATION = ["Self", "Spouse", "Child", "Parent", "Sibling", "Other"];

export default function MyWelfare() {
  const { user } = useAuth();
  const fines = useFetch("/my/fines");
  const welfare = useFetch("/my/welfare");
  const attendance = useFetch("/my/attendance");
  const cycles = useFetch("/merry-go-round");
  const cycleId = (cycles.data || []).find((c) => c.status === "active")?._id || cycles.data?.[0]?._id;
  const cycle = useFetch(cycleId ? `/merry-go-round/${cycleId}` : null, { skip: !cycleId });
  const [tab, setTab] = useState("fines");
  const [petition, setPetition] = useState(false);

  const unpaidFines = (fines.data || []).filter((f) => f.status === "unpaid").reduce((s, f) => s + f.amount, 0);
  const claims = welfare.data?.claims || [];
  const att = attendance.data || [];
  const present = att.filter((a) => a.status === "present").length;
  const pct = att.length ? Math.round((present / att.length) * 1000) / 10 : null;
  const myRound = cycle.data?.rounds.find((r) => r.member._id === user?.id);

  const TABS = [
    ["fines", "gavel", "Fines", unpaidFines ? `${kes(unpaidFines)} due` : "None due"],
    ["welfare", "volunteer_activism", "Welfare", `${claims.length} claim${claims.length === 1 ? "" : "s"}`],
    ["turn", "sync_alt", "My turn", myRound ? `#${myRound.position}` : "—"],
    ["attendance", "how_to_reg", "Meetings", pct === null ? "—" : `${pct}%`],
  ];

  const firstError = fines.error || welfare.error || attendance.error;
  if (firstError) return <div className="p-4"><ErrorNote message={firstError} onRetry={() => { fines.reload(); welfare.reload(); attendance.reload(); }} /></div>;
  if (!fines.data || !welfare.data || !attendance.data) return <Loading text="Loading…" />;

  return (
    <div className="px-margin-mobile flex flex-col gap-space-md pt-space-md pb-space-lg">
      <div>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-extrabold tracking-tight">Welfare & governance</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Your fines, welfare support, merry-go-round turn and meeting attendance.</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {TABS.map(([k, icon, label, stat]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-xl p-2.5 flex flex-col items-center gap-0.5 text-center transition-colors ${tab === k ? "bg-primary-container text-on-primary shadow-md" : "bg-surface-container-lowest text-on-surface-variant shadow-sm"}`}>
            <Icon name={icon} fill={tab === k} className="text-[22px]" />
            <span className="font-label-sm text-label-sm font-bold">{label}</span>
            <span className={`font-body-sm text-[11px] ${tab === k ? "text-secondary-fixed" : ""}`}>{stat}</span>
          </button>
        ))}
      </div>

      {tab === "fines" && (
        <section className="flex flex-col gap-3">
          <div className={`rounded-xl p-5 shadow-sm ${unpaidFines ? "bg-error-container text-on-error-container" : "bg-tertiary-fixed/30 text-on-tertiary-fixed-variant"}`}>
            <p className="font-label-md text-label-md font-bold uppercase tracking-wider">Fines to pay</p>
            <p className="font-currency-stat text-currency-stat font-extrabold">{kes(unpaidFines)}</p>
            <p className="font-body-sm text-body-sm">{unpaidFines ? "Pay the chairperson and ask for it to be marked paid." : "You have no unpaid fines."}</p>
          </div>
          <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
            <h3 className="font-headline-sm text-headline-sm font-bold mb-3">History</h3>
            {fines.data.length === 0 ? <p className="font-body-md text-on-surface-variant">No fines on your record.</p> : (
              <div className="flex flex-col gap-2.5">
                {fines.data.map((f) => { const [tone, label] = FINE_STATUS[f.status]; return (
                  <div key={f._id} className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-3">
                    <div className="min-w-0"><p className="font-label-md text-label-md font-bold">{FINE_REASONS[f.reason]}</p><p className="font-body-sm text-body-sm text-outline truncate">{fullDate(f.dateIssued)}{f.note ? ` · ${f.note}` : ""}</p></div>
                    <div className="text-right shrink-0"><p className="font-label-lg text-label-lg font-extrabold">{kes(f.amount)}</p><Pill tone={tone}>{label}</Pill></div>
                  </div>); })}
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "welfare" && (
        <section className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm"><p className="font-label-sm text-label-sm text-on-surface-variant font-bold">You contributed</p><p className="font-headline-sm text-headline-sm font-extrabold text-primary-container">{kes(welfare.data.myContributions)}</p></div>
            <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm"><p className="font-label-sm text-label-sm text-on-surface-variant font-bold">Support received</p><p className="font-headline-sm text-headline-sm font-extrabold text-primary-container">{kes(claims.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount, 0))}</p></div>
          </div>
          <button className={btnPrimary} onClick={() => setPetition(true)}><Icon name="add_circle" className="text-[20px]" /> Ask for welfare support</button>
          <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
            <h3 className="font-headline-sm text-headline-sm font-bold mb-3">My requests</h3>
            {claims.length === 0 ? <p className="font-body-md text-on-surface-variant">You have not made a welfare request.</p> : (
              <div className="flex flex-col gap-2.5">
                {claims.map((c) => { const [tone, label] = CLAIM_STATUS[c.status]; const cat = welfare.data.categories.find((x) => x.key === c.category); return (
                  <div key={c._id} className="p-3 rounded-xl bg-surface-container-low">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0"><p className="font-label-md text-label-md font-bold">{cat?.label || c.category}</p><p className="font-body-sm text-body-sm text-outline">{c.claimNo ? `${c.claimNo} · ` : ""}{fullDate(c.date)}</p></div>
                      <div className="text-right shrink-0"><p className="font-label-lg text-label-lg font-extrabold">{kes(c.amount)}</p><Pill tone={tone}>{label}</Pill></div>
                    </div>
                    {c.status === "rejected" && c.rejectionReason && <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">Reason: {c.rejectionReason}</p>}
                  </div>); })}
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "turn" && (
        <section className="flex flex-col gap-3">
          {!cycle.data ? (
            <p className="rounded-xl bg-surface-container-lowest p-5 shadow-sm font-body-md text-on-surface-variant">No merry-go-round cycle is running right now.</p>
          ) : !myRound ? (
            <p className="rounded-xl bg-surface-container-lowest p-5 shadow-sm font-body-md text-on-surface-variant">You are not in {cycle.data.name}. Members who join after the draw are not added to a running cycle.</p>
          ) : (
            <>
              <div className="rounded-xl bg-primary-container text-surface-bright p-5 shadow-xl">
                <p className="font-label-md text-label-md text-secondary-fixed uppercase tracking-wider font-bold">{cycle.data.name}</p>
                <p className="mt-1 font-body-md text-body-md text-on-primary-container">Your turn</p>
                <p className="font-currency-stat text-currency-stat font-extrabold">#{myRound.position} <span className="text-headline-sm font-bold text-primary-fixed-dim">of {cycle.data.rounds.length}</span></p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div><p className="font-label-sm text-label-sm text-on-primary-container">You receive</p><p className="font-headline-sm text-headline-sm font-extrabold text-secondary-fixed">{kes(myRound.payout)}</p></div>
                  <div><p className="font-label-sm text-label-sm text-on-primary-container">{myRound.status === "paid" ? "Received on" : "Expected on"}</p><p className="font-label-lg text-label-lg font-bold">{fullDate(myRound.status === "paid" ? myRound.paidOn : myRound.scheduledDate)}</p></div>
                </div>
              </div>
              {(() => {
                const paidIn = cycle.data.rounds.filter((r) => r.paidBy.includes(user.id)).length;
                const current = cycle.data.rounds.find((r) => r.status === "pending");
                return (
                  <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between font-label-md text-label-md"><span className="font-bold">Your stakes</span><span>{paidIn} of {cycle.data.rounds.length} turns</span></div>
                    <div className="h-2 rounded-full bg-surface-container-high overflow-hidden"><div className="h-full rounded-full bg-secondary-container" style={{ width: `${(paidIn / cycle.data.rounds.length) * 100}%` }} /></div>
                    {current && <p className="font-body-sm text-body-sm text-on-surface-variant">Now collecting for turn #{current.position} ({current.member.name}). {current.paidBy.includes(user.id) ? "You have paid your stake." : `Your stake of ${kes(cycle.data.amountPerMember)} is still due.`}</p>}
                  </div>
                );
              })()}
            </>
          )}
        </section>
      )}

      {tab === "attendance" && (
        <section className="flex flex-col gap-3">
          <div className="rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <p className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">Your attendance</p>
            <p className="font-currency-stat text-currency-stat font-extrabold text-primary-container">{pct === null ? "—" : `${pct}%`}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{present} of {att.length} meetings attended</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {["present", "apology", "absent"].map((k) => <div key={k} className="rounded-xl bg-surface-container-low p-2"><p className="font-headline-sm text-headline-sm font-extrabold">{att.filter((a) => a.status === k).length}</p><p className="font-label-sm text-label-sm text-on-surface-variant">{ATT[k][1]}</p></div>)}
            </div>
          </div>
          <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
            <h3 className="font-headline-sm text-headline-sm font-bold mb-3">Recent meetings</h3>
            {att.length === 0 ? <p className="font-body-md text-on-surface-variant">No meetings recorded yet.</p> : (
              <div className="flex flex-col gap-2.5">
                {att.slice(0, 12).map((a) => { const [tone, label] = ATT[a.status]; return (
                  <div key={a.id} className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-3">
                    <div className="min-w-0"><p className="font-label-md text-label-md font-bold truncate">{a.title}</p><p className="font-body-sm text-body-sm text-outline">{fullDate(a.date)}{a.fined ? " · fined" : ""}</p></div>
                    <Pill tone={tone}>{label}</Pill>
                  </div>); })}
              </div>
            )}
          </div>
        </section>
      )}

      {petition && <PetitionModal categories={welfare.data.categories} onClose={() => setPetition(false)} onSaved={() => { setPetition(false); welfare.reload(); }} />}
    </div>
  );
}

function PetitionModal({ categories, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ category: categories[0]?.key || "other", amount: "", beneficiary: "", relationship: "Self", note: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const cat = categories.find((c) => c.key === f.category);
  const submit = async () => {
    setErr("");
    if (!(Number(f.amount) > 0)) return setErr("Enter the amount you are asking for.");
    setSaving(true);
    try { await api.post("/my/welfare/claims", { ...f, amount: Number(f.amount) }); toast("Your request has been sent to the chairperson"); onSaved(); }
    catch (e) { setErr(e.response?.data?.message || "Could not send your request."); setSaving(false); }
  };
  return (
    <Modal title="Ask for welfare support" subtitle="The chairperson reviews every request" icon="volunteer_activism" onClose={onClose} size="max-w-md"
      footer={<><button className={btnSecondary} onClick={onClose}>Cancel</button><button className={btnPrimary} onClick={submit} disabled={saving}>{saving ? "Sending…" : "Send request"}</button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Type of support" hint={cat?.cap > 0 ? `The fund pays up to ${kes(cat.cap)} for this.` : ""}>
          <select className={inputCls} value={f.category} onChange={set("category")}>{categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
        </Field>
        <Field label="Amount (KES)"><input type="number" min="1" className={inputCls} value={f.amount} onChange={set("amount")} /></Field>
        <Field label="Who is it for?"><input className={inputCls} value={f.beneficiary} onChange={set("beneficiary")} placeholder="Name of the person" /></Field>
        <Field label="Relationship to you"><select className={inputCls} value={f.relationship} onChange={set("relationship")}>{RELATION.map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="Details (optional)"><textarea rows={2} className={`${inputCls} h-auto py-2`} value={f.note} onChange={set("note")} /></Field>
        {err && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">{err}</p>}
      </div>
    </Modal>
  );
}
