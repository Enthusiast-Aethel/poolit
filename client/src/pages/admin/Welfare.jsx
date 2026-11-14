import { useState } from "react";
import api from "../../api/client";
import useFetch from "../../hooks/useFetch";
import Icon from "../../components/Icon";
import { useToast } from "../../components/Toast";
import {
  PageHeader, StatCard, Pill, Avatar, Modal, Field, Loading, ErrorNote, EmptyRow, SectionTabs,
  inputCls, btnPrimary, btnSecondary, btnDanger, thCls, tdCls,
} from "../../components/ui";
import { kes, MONTHS } from "../../utils/format";
import { fullDate, isoDate } from "../../utils/dates";
import { downloadCsv } from "../../utils/csv";
import { accentFor } from "../../utils/accents";

export const POOL_TABS = [{ to: "/admin/welfare", label: "Welfare fund" }, { to: "/admin/welfare/merry-go-round", label: "Merry-go-round" }];
const STATUS = { pending: ["warn", "Under review"], paid: ["good", "Paid"], rejected: ["neutral", "Rejected"] };
const RELATION = ["Self", "Spouse", "Child", "Parent", "Sibling", "Other"];

export default function Welfare() {
  const toast = useToast();
  const [year] = useState(new Date().getFullYear());
  const { data, loading, error, reload } = useFetch(`/welfare?year=${year}`);
  const members = useFetch("/members");
  const [tab, setTab] = useState("claims");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [modal, setModal] = useState(null); // { kind: "claim" | "pay" | "reject", claim? }

  const catLabel = (k) => data?.categories.find((c) => c.key === k)?.label || k;
  const done = () => { setModal(null); reload(); };

  const claims = (data?.claims || []).filter((c) => {
    const q = query.trim().toLowerCase();
    const hit = !q || c.member?.name.toLowerCase().includes(q) || (c.claimNo || "").toLowerCase().includes(q) || (c.beneficiary || "").toLowerCase().includes(q);
    return hit && (cat === "all" || c.category === cat);
  });

  const belowFloor = data && data.floor > 0 && data.balance < data.floor;
  const pct = data && data.floor > 0 ? Math.min(100, Math.round((data.balance / data.floor) * 100)) : null;
  const mixTotal = data ? Object.values(data.byCategory).reduce((s, v) => s + v, 0) : 0;

  const exportCsv = () =>
    downloadCsv("welfare-claims.csv", claims.map((c) => ({
      "Claim no": c.claimNo || "", Date: fullDate(c.date), Claimant: c.member?.name, Beneficiary: c.beneficiary || "",
      Relationship: c.relationship || "", Category: catLabel(c.category), Amount: c.amount, Status: STATUS[c.status][1],
      "Supporting document": c.reference || "", "Payment reference": c.paymentRef || "",
    })));

  return (
    <div>
      <PageHeader
        eyebrow="Mutual support"
        title="Welfare & chama pool"
        subtitle="The welfare fund: what comes in, what is claimed and what is paid out."
        actions={<>
          <button className={btnSecondary} onClick={exportCsv}><Icon name="download" className="text-[20px]" /> Export</button>
          <button className={btnPrimary} onClick={() => setModal({ kind: "claim" })}><Icon name="add_circle" className="text-[20px]" /> Record claim</button>
        </>}
      />
      <SectionTabs tabs={POOL_TABS} />

      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}

      {data && (
        <>
          {belowFloor && (
            <div role="alert" className="mb-4 p-4 rounded-xl bg-error-container text-on-error-container flex items-start gap-3">
              <Icon name="warning" fill className="mt-0.5" />
              <p className="font-body-md text-body-md">
                The fund is <strong>{kes(data.floor - data.balance)}</strong> below the minimum reserve of {kes(data.floor)}. Consider holding back non-urgent claims or asking members for a special contribution.
              </p>
            </div>
          )}

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon="shield_with_heart" tone={belowFloor ? "bad" : "gold"} label="Welfare fund" value={kes(data.balance)}
              note={data.floor > 0 ? `Minimum reserve ${kes(data.floor)}` : `${kes(data.totalIn)} in, ${kes(data.totalOut)} out`} />
            <StatCard icon="payments" label={`Claims paid in ${data.year}`} value={kes(data.paidYtd.amount)} note={`${data.paidYtd.count} claim(s)`} />
            <StatCard icon="savings" label="Collected this month" value={kes(data.monthlyInflow)} note="Welfare contributions received" />
            <StatCard icon="pending_actions" label="Claims under review" value={data.pending.count} note={data.pending.count ? kes(data.pending.amount) : "Nothing waiting"} />
          </section>

          <section className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
            {pct !== null && (
              <div className="rounded-xl bg-surface-container-lowest shadow-sm p-5">
                <h2 className="font-headline-sm text-headline-sm font-bold text-primary-container">Reserve level</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Fund balance against the minimum reserve.</p>
                <div className="mt-4 h-3 rounded-full bg-surface-container-high overflow-hidden">
                  <div className={`h-full rounded-full ${belowFloor ? "bg-error" : "bg-on-tertiary-fixed-variant"}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 font-label-md text-label-md font-bold">{pct}% of the minimum</p>
              </div>
            )}
            <div className={`rounded-xl bg-surface-container-lowest shadow-sm p-5 ${pct === null ? "xl:col-span-3" : "xl:col-span-2"}`}>
              <h2 className="font-headline-sm text-headline-sm font-bold text-primary-container">Where the money went in {data.year}</h2>
              {mixTotal === 0 ? <p className="mt-3 font-body-md text-on-surface-variant">No claims paid yet.</p> : (
                <div className="mt-3 flex flex-col gap-3">
                  {Object.entries(data.byCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                    <div key={k}>
                      <div className="flex justify-between font-label-md text-label-md"><span className="font-bold">{catLabel(k)}</span><span>{kes(v)} ({Math.round((v / mixTotal) * 100)}%)</span></div>
                      <div className="mt-1 h-2 rounded-full bg-surface-container-high"><div className={`h-full rounded-full ${accentFor(k).bar}`} style={{ width: `${(v / mixTotal) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mt-6 rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
            <div className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between border-b border-outline-variant/40">
              <div className="flex gap-2">
                {[["claims", "Claims"], ["ledger", "Monthly ledger"]].map(([k, label]) => (
                  <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-full font-label-md text-label-md font-bold ${tab === k ? "bg-primary-container text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>{label}</button>
                ))}
              </div>
              {tab === "claims" && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                    <input className={`${inputCls} pl-10`} placeholder="Search claimant or claim no." value={query} onChange={(e) => setQuery(e.target.value)} />
                  </div>
                  <select className={`${inputCls} sm:w-52`} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
                    <option value="all">All categories</option>
                    {data.categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
              )}
            </div>

            {tab === "claims" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                  <thead className="bg-surface-container-low"><tr>
                    <th className={thCls}>Claim</th><th className={thCls}>Claimant</th><th className={thCls}>Category</th>
                    <th className={`${thCls} text-right`}>Amount</th><th className={thCls}>Status</th><th className={thCls}>Documents</th><th className={thCls} />
                  </tr></thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {claims.length === 0 && <EmptyRow cols={7} text="No claims yet." />}
                    {claims.map((c) => {
                      const [tone, label] = STATUS[c.status];
                      return (
                        <tr key={c._id} className="hover:bg-surface-container-low">
                          <td className={tdCls}><div className="font-mono text-on-surface-variant">{c.claimNo || c._id.slice(-6)}</div><div className="font-body-sm text-body-sm text-on-surface-variant">{fullDate(c.date)}</div></td>
                          <td className={tdCls}>
                            <div className="flex items-center gap-3"><Avatar name={c.member?.name} size="w-9 h-9" />
                              <div><div className="font-label-lg text-label-lg font-bold">{c.member?.name}</div>
                                <div className="font-body-sm text-body-sm text-on-surface-variant">{c.beneficiary ? `For ${c.beneficiary}${c.relationship ? ` (${c.relationship})` : ""}` : ""}</div></div></div>
                          </td>
                          <td className={tdCls}>{catLabel(c.category)}</td>
                          <td className={`${tdCls} text-right font-bold`}>{kes(c.amount)}</td>
                          <td className={tdCls}><Pill tone={tone}>{label}</Pill>{c.status === "rejected" && c.rejectionReason && <div className="font-body-sm text-body-sm text-on-surface-variant max-w-[200px] truncate" title={c.rejectionReason}>{c.rejectionReason}</div>}</td>
                          <td className={`${tdCls} font-body-sm text-body-sm text-on-surface-variant`}>{c.reference || "—"}{c.paymentRef && <div>Paid: {c.paymentRef}</div>}</td>
                          <td className={`${tdCls} text-right whitespace-nowrap`}>
                            {c.status === "pending" && (
                              <div className="inline-flex gap-2">
                                <button onClick={() => setModal({ kind: "pay", claim: c })} className="px-3 py-1.5 rounded-lg bg-tertiary-fixed/40 text-on-tertiary-fixed-variant font-label-md text-label-md font-bold hover:opacity-80">Pay</button>
                                <button onClick={() => setModal({ kind: "reject", claim: c })} className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md font-bold hover:bg-surface-container-high">Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[720px]">
                  <thead className="bg-surface-container-low"><tr>
                    <th className={thCls}>Month</th><th className={`${thCls} text-right`}>Opening</th><th className={`${thCls} text-right`}>Collected</th>
                    <th className={`${thCls} text-right`}>Paid out</th><th className={`${thCls} text-right`}>Net</th><th className={`${thCls} text-right`}>Closing</th>
                    {data.floor > 0 && <th className={thCls}>Reserve</th>}
                  </tr></thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {data.ledger.length === 0 && <EmptyRow cols={7} text="Nothing recorded for this year yet." />}
                    {[...data.ledger].reverse().map((r) => (
                      <tr key={r.month}>
                        <td className={`${tdCls} font-bold`}>{MONTHS[r.month - 1]} {data.year}</td>
                        <td className={`${tdCls} text-right`}>{kes(r.opening)}</td>
                        <td className={`${tdCls} text-right text-on-tertiary-fixed-variant`}>+{kes(r.collected)}</td>
                        <td className={`${tdCls} text-right ${r.disbursed ? "text-error" : ""}`}>{r.disbursed ? `-${kes(r.disbursed)}` : kes(0)}</td>
                        <td className={`${tdCls} text-right`}>{r.net < 0 ? `-${kes(-r.net)}` : kes(r.net)}</td>
                        <td className={`${tdCls} text-right font-bold`}>{kes(r.closing)}</td>
                        {data.floor > 0 && <td className={tdCls}><Pill tone={r.closing >= data.floor ? "good" : "bad"}>{r.closing >= data.floor ? "Above minimum" : "Below minimum"}</Pill></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {modal?.kind === "claim" && members.data && data && (
        <ClaimModal members={members.data} categories={data.categories} balance={data.balance} onClose={() => setModal(null)} onSaved={done} />
      )}
      {modal?.kind === "pay" && <PayModal claim={modal.claim} balance={data.balance} onClose={() => setModal(null)} onSaved={done} toast={toast} />}
      {modal?.kind === "reject" && <RejectModal claim={modal.claim} onClose={() => setModal(null)} onSaved={done} toast={toast} />}
    </div>
  );
}

function ClaimModal({ members, categories, balance, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ member: "", beneficiary: "", relationship: "Self", category: categories[0]?.key || "other", amount: "", reference: "", note: "", date: isoDate(), payNow: false, paymentRef: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const cat = categories.find((c) => c.key === f.category);

  const submit = async () => {
    setErr("");
    if (!f.member) return setErr("Choose the member making the claim.");
    if (!(Number(f.amount) > 0)) return setErr("Enter the amount.");
    setSaving(true);
    try {
      await api.post("/welfare/claims", { ...f, amount: Number(f.amount) });
      toast(f.payNow ? "Claim recorded and paid" : "Claim recorded for review");
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || "Could not record the claim.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Record a welfare claim" subtitle={`Fund balance ${kes(balance)}`} icon="healing" onClose={onClose} size="max-w-xl"
      footer={<><button className={btnSecondary} onClick={onClose}>Cancel</button><button className={btnPrimary} onClick={submit} disabled={saving}>{saving ? "Saving…" : f.payNow ? "Record and pay" : "Record claim"}</button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Member claiming" className="sm:col-span-2">
          <select className={inputCls} value={f.member} onChange={set("member")}>
            <option value="">Select a member…</option>
            {members.filter((m) => m.isActive).map((m) => <option key={m._id} value={m._id}>{m.memberNo ? `#${m.memberNo} · ` : ""}{m.name}</option>)}
          </select>
        </Field>
        <Field label="Who is it for?"><input className={inputCls} value={f.beneficiary} onChange={set("beneficiary")} placeholder="Name of the person" /></Field>
        <Field label="Relationship"><select className={inputCls} value={f.relationship} onChange={set("relationship")}>{RELATION.map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="Category" hint={cat?.cap > 0 ? `Limit ${kes(cat.cap)}` : "No limit set"}>
          <select className={inputCls} value={f.category} onChange={set("category")}>{categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
        </Field>
        <Field label="Amount (KES)"><input type="number" min="1" className={inputCls} value={f.amount} onChange={set("amount")} /></Field>
        <Field label="Claim date"><input type="date" className={inputCls} value={f.date} onChange={set("date")} /></Field>
        <Field label="Supporting document" hint="Hospital bill, death certificate number…"><input className={inputCls} value={f.reference} onChange={set("reference")} /></Field>
        <Field label="Note (optional)" className="sm:col-span-2"><input className={inputCls} value={f.note} onChange={set("note")} /></Field>
        <label className="sm:col-span-2 flex items-center gap-2 font-label-md text-label-md">
          <input type="checkbox" className="w-4 h-4 accent-primary-container" checked={f.payNow} onChange={set("payNow")} /> Pay it out now (skip review)
        </label>
        {f.payNow && <Field label="Payment reference" className="sm:col-span-2" hint="M-Pesa code or bank reference"><input className={`${inputCls} uppercase`} value={f.paymentRef} onChange={set("paymentRef")} /></Field>}
      </div>
      {err && <p role="alert" className="mt-4 p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">{err}</p>}
    </Modal>
  );
}

function PayModal({ claim, balance, onClose, onSaved, toast }) {
  const [paymentRef, setRef] = useState("");
  const [paidOn, setPaidOn] = useState(isoDate());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const submit = async () => {
    setSaving(true); setErr("");
    try { await api.patch(`/welfare/claims/${claim._id}/pay`, { paymentRef, paidOn }); toast("Claim paid"); onSaved(); }
    catch (e) { setErr(e.response?.data?.message || "Could not pay the claim."); }
    finally { setSaving(false); }
  };
  return (
    <Modal title="Pay claim" subtitle={`${claim.member?.name} · ${kes(claim.amount)}`} icon="payments" onClose={onClose} size="max-w-md"
      footer={<><button className={btnSecondary} onClick={onClose}>Cancel</button><button className={btnPrimary} onClick={submit} disabled={saving}>{saving ? "Saving…" : "Confirm payment"}</button></>}>
      <p className="font-body-md text-body-md text-on-surface-variant mb-4">This takes {kes(claim.amount)} out of the fund (balance {kes(balance)}).</p>
      <div className="flex flex-col gap-4">
        <Field label="Date paid"><input type="date" className={inputCls} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
        <Field label="Payment reference" hint="M-Pesa code or bank reference"><input className={`${inputCls} uppercase`} value={paymentRef} onChange={(e) => setRef(e.target.value)} /></Field>
      </div>
      {err && <p role="alert" className="mt-4 p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">{err}</p>}
    </Modal>
  );
}

function RejectModal({ claim, onClose, onSaved, toast }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try { await api.patch(`/welfare/claims/${claim._id}/reject`, { reason }); toast("Claim rejected"); onSaved(); }
    catch (e) { toast(e.response?.data?.message || "Could not reject.", "error"); setSaving(false); }
  };
  return (
    <Modal title="Reject claim" subtitle={`${claim.member?.name} · ${kes(claim.amount)}`} icon="cancel" onClose={onClose} size="max-w-md"
      footer={<><button className={btnSecondary} onClick={onClose}>Cancel</button><button className={btnDanger} onClick={submit} disabled={saving || !reason.trim()}>{saving ? "Saving…" : "Reject claim"}</button></>}>
      <Field label="Reason"><textarea rows={3} className={`${inputCls} h-auto py-2`} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
    </Modal>
  );
}
