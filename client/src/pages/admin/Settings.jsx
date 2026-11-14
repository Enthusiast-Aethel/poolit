import { useEffect, useState } from "react";
import api from "../../api/client";
import useFetch from "../../hooks/useFetch";
import Icon from "../../components/Icon";
import { useToast } from "../../components/Toast";
import { PageHeader, Modal, Field, Loading, ErrorNote, Pill, inputCls, btnPrimary, btnSecondary } from "../../components/ui";
import { ROLE_LABEL } from "../../utils/labels";
import { kes } from "../../utils/format";
import { fullDate } from "../../utils/dates";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const FREQ = { monthly: "Every month", one_time: "Once", rotational: "Rotation", ad_hoc: "When needed" };
const NUMERIC = [
  "fiscalYearStartMonth", "contributionDueDay", "loanMultiplier", "interestRate", "smallLoanThreshold", "smallLoanMonths",
  "maxLoanMonths", "guarantorsRequired", "quorumPercent", "welfare.reserveFloor",
  ...["lateContribution", "missedMeeting", "lateRepayment"].flatMap((r) => [`fines.${r}.value`, `fines.${r}.graceDays`]),
];
const FINE_ROWS = [["lateContribution", "Late contribution"], ["missedMeeting", "Missed meeting"], ["lateRepayment", "Late loan repayment"]];
const LABELS = {
  chamaName: "Chama name", interestRate: "Interest rate", loanMultiplier: "Borrowing multiplier", contributionDueDay: "Contribution due day",
  smallLoanThreshold: "Small loan limit", smallLoanMonths: "Small loan period", maxLoanMonths: "Maximum loan period",
  guarantorsRequired: "Guarantors required", quorumPercent: "Quorum %", "welfare.reserveFloor": "Welfare minimum reserve",
  "welfare.categories": "Welfare categories",
};

const getIn = (o, p) => p.split(".").reduce((a, k) => a?.[k], o);
const setIn = (o, p, v) => {
  const next = structuredClone(o);
  const keys = p.split(".");
  let ref = next;
  keys.slice(0, -1).forEach((k) => (ref = ref[k]));
  ref[keys[keys.length - 1]] = v;
  return next;
};
const coerce = (f) => {
  let n = structuredClone(f);
  NUMERIC.forEach((p) => (n = setIn(n, p, Number(getIn(n, p)))));
  n.welfare.categories = n.welfare.categories.map((c) => ({ ...c, cap: Number(c.cap) || 0 }));
  return n;
};
const slug = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export default function Settings() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch("/settings");
  const types = useFetch("/contribution-types");
  const members = useFetch("/members");
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => { if (data) setF(structuredClone(data)); }, [data]);
  const dirty = f && data && JSON.stringify(f) !== JSON.stringify(data);

  const on = (path) => (e) => setF(setIn(f, path, e.target.value));
  const txt = (label, path, o = {}) => (
    <Field label={label} hint={o.hint} className={o.wide ? "md:col-span-2" : ""}>
      {o.area
        ? <textarea rows={2} className={`${inputCls} h-auto py-2`} value={getIn(f, path) ?? ""} onChange={on(path)} />
        : <input className={inputCls} value={getIn(f, path) ?? ""} onChange={on(path)} placeholder={o.placeholder} />}
    </Field>
  );
  const num = (label, path, o = {}) => (
    <Field label={label} hint={o.hint}>
      <input type="number" min={o.min ?? 0} max={o.max} step={o.step} className={inputCls} value={getIn(f, path) ?? ""} onChange={on(path)} />
    </Field>
  );

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings", coerce(f));
      toast("Settings saved");
      reload();
    } catch (e) {
      toast(e.response?.data?.message || "Could not save the settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const setRole = async (m, role) => {
    try { await api.put(`/members/${m._id}`, { role }); toast(`${m.name} is now ${ROLE_LABEL[role]}`); members.reload(); }
    catch (e) { toast(e.response?.data?.message || "Could not change the role.", "error"); }
  };

  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (loading && !f) return <Loading />;
  if (!f) return null;

  const cats = f.welfare.categories;

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Governance"
        title="Settings & rules"
        subtitle="The chama's rules live here. Every calculation in the system (loan limits, fines, due dates) reads from these values, and every change is logged."
        actions={<button className={btnSecondary} onClick={() => setShowLog(true)}><Icon name="history" className="text-[20px]" /> Change log</button>}
      />

      <div className="flex flex-col gap-6">
        <Section icon="account_balance" title="Chama details" note="Shown on member screens and statements. Bank and KRA details are visible to the chairperson only.">
          {txt("Chama name", "chamaName")}
          {txt("Registration number", "registrationNumber")}
          {txt("KRA PIN", "kraPin")}
          <Field label="Financial year starts in">
            <select className={inputCls} value={f.fiscalYearStartMonth} onChange={on("fiscalYearStartMonth")}>
              {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </Field>
          {txt("Paybill or till number", "paybill")}
          {txt("Contact phone", "contactPhone")}
          {txt("Contact email", "contactEmail")}
          {txt("Postal or physical address", "address")}
          {txt("Bank details", "bankDetails", { area: true, wide: true, hint: "For example: bank, branch and account number." })}
        </Section>

        <Section icon="savings" title="Contributions" note="Amounts are set per contribution type below. Add a new type any time, such as a building fund or special levy.">
          {num("Monthly contribution is due on day", "contributionDueDay", { min: 1, max: 28, hint: "Day of the month (1 to 28). The grace period is set under Fines." })}
          <div className="md:col-span-2"><TypesCard types={types.data} onChanged={types.reload} /></div>
        </Section>

        <Section icon="real_estate_agent" title="Loans" note="Applies to every new loan. Existing loans keep the rate they were given.">
          {num("Interest rate (% a year)", "interestRate", { step: "0.1" })}
          {num("Borrowing multiplier", "loanMultiplier", { step: "0.1", hint: "A member can borrow this many times their savings, less what they still owe." })}
          {num("Small loan limit (KES)", "smallLoanThreshold", { hint: "Loans up to this amount, or up to the member's own savings, use the short period." })}
          {num("Small loan repayment (months)", "smallLoanMonths", { min: 1 })}
          {num("Largest loan repayment (months)", "maxLoanMonths", { min: 1 })}
          {num("Guarantors required", "guarantorsRequired", { hint: "Not needed when the loan is covered by the member's own savings." })}
        </Section>

        <Section icon="gavel" title="Fines" note="A percentage applies to the overdue amount. Fines are only charged after the grace period.">
          <div className="md:col-span-2 overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                <th className="py-2 pr-3">For</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Amount</th><th className="py-2">Grace days</th>
              </tr></thead>
              <tbody className="divide-y divide-outline-variant/30">
                {FINE_ROWS.map(([key, label]) => (
                  <tr key={key}>
                    <td className="py-2 pr-3 font-label-lg text-label-lg font-bold whitespace-nowrap">{label}</td>
                    <td className="py-2 pr-3">
                      <select className={`${inputCls} w-40`} value={f.fines[key].mode} onChange={on(`fines.${key}.mode`)}>
                        <option value="flat">Flat amount (KES)</option><option value="percentage">Percentage (%)</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3"><input type="number" min="0" className={`${inputCls} w-28`} value={f.fines[key].value} onChange={on(`fines.${key}.value`)} /></td>
                    <td className="py-2"><input type="number" min="0" className={`${inputCls} w-24`} value={f.fines[key].graceDays} onChange={on(`fines.${key}.graceDays`)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section icon="diversity_3" title="Welfare fund" note="Claim categories and the most the fund will pay for each (0 means no limit).">
          {num("Minimum reserve (KES)", "welfare.reserveFloor", { hint: "You get a warning when the fund falls below this. Leave 0 for no warning." })}
          <div className="md:col-span-2 flex flex-col gap-2">
            {cats.map((c, i) => (
              <div key={c.key} className="grid grid-cols-[1fr_9rem_auto] gap-2 items-center">
                <input className={inputCls} value={c.label} onChange={(e) => setF(setIn(f, `welfare.categories`, cats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x))))} aria-label="Category name" />
                <input type="number" min="0" className={inputCls} value={c.cap} placeholder="Limit" onChange={(e) => setF(setIn(f, `welfare.categories`, cats.map((x, j) => (j === i ? { ...x, cap: e.target.value } : x))))} aria-label="Limit in KES" />
                <button type="button" aria-label="Remove category" className="p-2 text-outline hover:text-error disabled:opacity-30" disabled={c.key === "other"}
                  onClick={() => setF(setIn(f, "welfare.categories", cats.filter((_, j) => j !== i)))}><Icon name="delete" /></button>
              </div>
            ))}
            <button type="button" className={`${btnSecondary} self-start`} onClick={() => {
              const label = window.prompt("Name of the new claim category");
              if (!label?.trim()) return;
              let key = slug(label) || "category";
              while (cats.some((c) => c.key === key)) key += "_2";
              setF(setIn(f, "welfare.categories", [...cats, { key, label: label.trim(), cap: 0 }]));
            }}><Icon name="add" className="text-[20px]" /> Add category</button>
          </div>
        </Section>

        <Section icon="groups" title="Meetings" note="Used on the meetings screen to show whether a sitting had quorum.">
          {num("Quorum (% of members present)", "quorumPercent", { max: 100, hint: "Leave 0 if your constitution has no quorum rule." })}
        </Section>

        <Section icon="admin_panel_settings" title="Officials & access" note="Titles are labels only. Whatever their title, the chairperson is the only person who can record or change anything. Everyone else sees only their own information.">
          <div className="md:col-span-2 divide-y divide-outline-variant/30">
            {(members.data || []).filter((m) => m.isActive).map((m) => (
              <div key={m._id} className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <div className="font-label-lg text-label-lg font-bold">{m.name}</div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">{m.memberNo ? `#${m.memberNo} · ` : ""}{m.phone}</div>
                </div>
                {m.role === "chairperson" ? (
                  <Pill tone="navy"><Icon name="lock" className="text-[14px]" /> Chairperson (admin)</Pill>
                ) : (
                  <select className={`${inputCls} w-52`} value={m.role} onChange={(e) => setRole(m, e.target.value)} aria-label={`Title for ${m.name}`}>
                    {["member", "vice_chairperson", "secretary", "treasurer", "supervisory"].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>
        </Section>
      </div>

      {dirty && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:left-64 z-40 bg-primary-container text-on-primary px-4 lg:px-8 py-3 flex items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.18)]">
          <span className="font-label-md text-label-md">You have unsaved changes.</span>
          <div className="flex gap-2">
            <button className="px-4 min-h-[44px] rounded-lg font-label-md text-label-md font-bold text-on-primary-container hover:text-on-primary" onClick={() => setF(structuredClone(data))}>Discard</button>
            <button className={btnPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
      )}
      {showLog && <LogModal onClose={() => setShowLog(false)} />}
    </div>
  );
}

function Section({ icon, title, note, children }) {
  return (
    <section className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-outline-variant/40 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-container text-secondary-fixed flex items-center justify-center shrink-0"><Icon name={icon} className="text-[22px]" /></div>
        <div>
          <h2 className="font-headline-sm text-headline-sm font-bold text-primary-container">{title}</h2>
          {note && <p className="font-body-sm text-body-sm text-on-surface-variant max-w-3xl">{note}</p>}
        </div>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

/* ---------- contribution types: edit amounts, add new ones ---------- */
function TypesCard({ types, onChanged }) {
  const toast = useToast();
  const [draft, setDraft] = useState({ name: "", amount: "", frequency: "ad_hoc" });
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!draft.name.trim()) return toast("Give the new contribution a name.", "error");
    setAdding(true);
    try {
      await api.post("/contribution-types", { ...draft, amount: Number(draft.amount) || 0 });
      toast("Contribution type added");
      setDraft({ name: "", amount: "", frequency: "ad_hoc" });
      onChanged();
    } catch (e) {
      toast(e.response?.data?.message || "Could not add it.", "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="rounded-xl bg-surface-container-low p-4">
      <h3 className="font-label-md text-label-md font-bold uppercase tracking-wider text-on-surface-variant mb-3">Contribution types</h3>
      <div className="flex flex-col gap-2">
        {(types || []).map((t) => <TypeRow key={t._id} t={t} onChanged={onChanged} />)}
      </div>
      <div className="mt-4 pt-4 border-t border-outline-variant/40 grid grid-cols-1 sm:grid-cols-[1fr_8rem_9rem_auto] gap-2 items-end">
        <Field label="New type"><input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Building fund" /></Field>
        <Field label="Amount (KES)"><input type="number" min="0" className={inputCls} value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></Field>
        <Field label="Collected">
          <select className={inputCls} value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value })}>
            {Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <button className={btnPrimary} onClick={add} disabled={adding}><Icon name="add" className="text-[20px]" /> Add</button>
      </div>
    </div>
  );
}

function TypeRow({ t, onChanged }) {
  const toast = useToast();
  const [v, setV] = useState({ name: t.name, amount: t.amount, frequency: t.frequency, isActive: t.isActive });
  const [saving, setSaving] = useState(false);
  const dirty = v.name !== t.name || Number(v.amount) !== t.amount || v.frequency !== t.frequency || v.isActive !== t.isActive;

  const save = async () => {
    setSaving(true);
    try { await api.put(`/contribution-types/${t._id}`, { ...v, amount: Number(v.amount) || 0 }); toast(`${v.name} saved`); onChanged(); }
    catch (e) { toast(e.response?.data?.message || "Could not save.", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem_9rem_auto_auto] gap-2 items-center">
      <input className={inputCls} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} aria-label="Name" />
      <input type="number" min="0" className={inputCls} value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} aria-label="Amount in KES" />
      <select className={inputCls} value={v.frequency} onChange={(e) => setV({ ...v, frequency: e.target.value })} aria-label="Collected">
        {Object.entries(FREQ).map(([k, x]) => <option key={k} value={k}>{x}</option>)}
      </select>
      <label className="flex items-center gap-2 font-label-md text-label-md px-2">
        <input type="checkbox" className="w-4 h-4 accent-primary-container" checked={v.isActive} onChange={(e) => setV({ ...v, isActive: e.target.checked })} /> Active
      </label>
      <button className={btnSecondary} onClick={save} disabled={!dirty || saving}>{saving ? "…" : "Save"}</button>
    </div>
  );
}

/* ---------- audit change log ---------- */
function LogModal({ onClose }) {
  const { data, loading } = useFetch("/settings/log");
  const show = (v) => { try { const x = JSON.parse(v); return typeof x === "object" ? JSON.stringify(x) : String(x); } catch { return v; } };
  return (
    <Modal title="Change log" subtitle="Who changed which rule, and when" icon="history" onClose={onClose} size="max-w-2xl">
      {loading && <Loading />}
      {data && data.length === 0 && <p className="font-body-md text-on-surface-variant">No changes have been made yet.</p>}
      <div className="flex flex-col gap-4">
        {(data || []).map((e, i) => (
          <div key={i} className="rounded-xl bg-surface-container-low p-4">
            <p className="font-label-md text-label-md font-bold">{e.byName || "Unknown"} <span className="font-body-sm text-on-surface-variant font-normal">· {fullDate(e.at)} {new Date(e.at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}</span></p>
            <ul className="mt-2 flex flex-col gap-1">
              {e.changes.map((c) => (
                <li key={c.field} className="font-body-sm text-body-sm break-words">
                  <span className="font-bold">{LABELS[c.field] || c.field}</span>: <span className="text-error line-through">{show(c.from)}</span> <Icon name="arrow_forward" className="text-[14px] align-middle" /> <span className="text-on-tertiary-fixed-variant font-bold">{show(c.to)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}
