import { useState } from "react";
import api from "../../api/client";
import useFetch from "../../hooks/useFetch";
import Icon from "../../components/Icon";
import { useToast } from "../../components/Toast";
import { PageHeader, StatCard, Pill, Modal, Field, Loading, ErrorNote, EmptyRow, SectionTabs, inputCls, btnPrimary, btnSecondary, thCls, tdCls } from "../../components/ui";
import { kes } from "../../utils/format";
import { fullDate, isoDate } from "../../utils/dates";
import { downloadCsv } from "../../utils/csv";
import { accentFor } from "../../utils/accents";
import { MONEY_TABS } from "./Dividends";

const INV_TYPES = { real_estate: "Real estate", land: "Land", bond: "Bonds", shares: "Shares", sacco: "SACCO deposit", money_market: "Money market fund", business: "Business or venture", other: "Other" };
const CATEGORIES = ["Administration", "Stationery", "Transport", "Meetings & AGM", "Bank charges", "Professional fees", "Communication"];

export default function Finance() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [tab, setTab] = useState("investments");
  const inv = useFetch("/investments");
  const exp = useFetch(`/expenses?year=${year}`);
  const [modal, setModal] = useState(null); // { kind, item? }
  const done = () => { setModal(null); inv.reload(); exp.reload(); };

  const i = inv.data;
  const gain = i ? i.totalValue - i.totalInvested : 0;
  const gainPct = i && i.totalInvested ? ((gain / i.totalInvested) * 100).toFixed(1) : null;

  const exportCsv = () =>
    tab === "investments"
      ? downloadCsv("investments.csv", (i?.investments || []).map((x) => ({ Name: x.name, Type: INV_TYPES[x.type], Invested: x.amountInvested, "Current value": x.currentValue, "Income earned": x.returns.reduce((s, r) => s + r.amount, 0), Status: x.status, Date: fullDate(x.dateInvested) })))
      : downloadCsv(`expenses-${year}.csv`, (exp.data?.expenses || []).map((x) => ({ Voucher: x.voucherNo || "", Date: fullDate(x.date), Category: x.category, Payee: x.payee || "", Description: x.description || "", Amount: x.amount, Reference: x.reference || "" })));

  return (
    <div>
      <PageHeader
        eyebrow="Year end"
        title="Expenses & investments"
        subtitle="What the chama spends to run itself, and what it has invested. Both feed the year-end surplus."
        actions={<>
          <button className={btnSecondary} onClick={exportCsv}><Icon name="download" className="text-[20px]" /> Export</button>
          {tab === "investments"
            ? <button className={btnPrimary} onClick={() => setModal({ kind: "invest" })}><Icon name="add" className="text-[20px]" /> New investment</button>
            : <button className={btnPrimary} onClick={() => setModal({ kind: "expense" })}><Icon name="add" className="text-[20px]" /> Record expense</button>}
        </>}
      />
      <SectionTabs tabs={MONEY_TABS} />

      {(inv.error || exp.error) && <ErrorNote message={inv.error || exp.error} onRetry={() => { inv.reload(); exp.reload(); }} />}
      {(inv.loading && !i) && <Loading />}

      {i && (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon="account_balance" label="Invested" value={kes(i.totalInvested)} note="Active investments, at cost" />
          <StatCard icon="monitoring" tone="gold" label="Current value" value={kes(i.totalValue)} note={gainPct !== null ? `${gain >= 0 ? "+" : ""}${kes(gain)} (${gainPct}%)` : "—"} />
          <StatCard icon="payments" label="Income this year" value={kes(i.returnsYtd)} note={`${kes(i.returnsTotal)} earned in total`} />
          <StatCard icon="receipt_long" label={`Expenses in ${year}`} value={exp.data ? kes(exp.data.total) : "—"} note="Running costs" />
        </section>
      )}

      <div className="mt-6 flex gap-2">
        {[["investments", "Investments"], ["expenses", "Expenses"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-full font-label-md text-label-md font-bold ${tab === k ? "bg-primary-container text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>{label}</button>
        ))}
      </div>

      {tab === "investments" && i && (
        <section className="mt-4 rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[920px]">
              <thead className="bg-surface-container-low"><tr>
                <th className={thCls}>Investment</th><th className={thCls}>Type</th><th className={`${thCls} text-right`}>Invested</th><th className={`${thCls} text-right`}>Value now</th>
                <th className={`${thCls} text-right`}>Gain</th><th className={`${thCls} text-right`}>Income earned</th><th className={thCls}>Status</th><th className={thCls} />
              </tr></thead>
              <tbody className="divide-y divide-outline-variant/30">
                {i.investments.length === 0 && <EmptyRow cols={8} text="No investments recorded yet." />}
                {i.investments.map((x) => {
                  const g = x.currentValue - x.amountInvested;
                  const income = x.returns.reduce((s, r) => s + r.amount, 0);
                  return (
                    <tr key={x._id} className="hover:bg-surface-container-low">
                      <td className={tdCls}><div className="font-label-lg text-label-lg font-bold">{x.name}</div><div className="font-body-sm text-body-sm text-on-surface-variant">{fullDate(x.dateInvested)}{x.expectedYield ? ` · expects ${x.expectedYield}% a year` : ""}</div></td>
                      <td className={tdCls}><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${accentFor(x.type).chip}`}>{INV_TYPES[x.type]}</span></td>
                      <td className={`${tdCls} text-right`}>{kes(x.amountInvested)}</td>
                      <td className={`${tdCls} text-right font-bold`}>{kes(x.currentValue)}</td>
                      <td className={`${tdCls} text-right ${g < 0 ? "text-error" : "text-on-tertiary-fixed-variant"}`}>{g < 0 ? "-" : "+"}{kes(Math.abs(g))}</td>
                      <td className={`${tdCls} text-right`}>{income ? kes(income) : <span className="text-outline">—</span>}</td>
                      <td className={tdCls}><Pill tone={x.status === "active" ? "good" : "neutral"}>{x.status === "active" ? "Active" : "Sold"}</Pill></td>
                      <td className={`${tdCls} text-right whitespace-nowrap`}>
                        {x.status === "active" && (
                          <div className="inline-flex gap-2">
                            <button onClick={() => setModal({ kind: "return", item: x })} className="px-3 py-1.5 rounded-lg bg-tertiary-fixed/40 text-on-tertiary-fixed-variant font-label-md text-label-md font-bold hover:opacity-80">Add income</button>
                            <button onClick={() => setModal({ kind: "value", item: x })} className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md font-bold hover:bg-surface-container-high">Update value</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "expenses" && (
        <section className="mt-4 rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
          <div className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between border-b border-outline-variant/40">
            <div className="flex flex-wrap gap-2">
              {Object.entries(exp.data?.byCategory || {}).sort((a, b) => b[1] - a[1]).map(([c, v]) => <span key={c} className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${accentFor(c).chip}`}>{c}: {kes(v)}</span>)}
            </div>
            <select className={`${inputCls} w-auto`} value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">{[thisYear, thisYear - 1, thisYear - 2].map((y) => <option key={y} value={y}>{y}</option>)}</select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[760px]">
              <thead className="bg-surface-container-low"><tr>
                <th className={thCls}>Voucher</th><th className={thCls}>Date</th><th className={thCls}>Details</th><th className={thCls}>Category</th><th className={`${thCls} text-right`}>Amount</th><th className={thCls} />
              </tr></thead>
              <tbody className="divide-y divide-outline-variant/30">
                {!exp.data && <EmptyRow cols={6} text="Loading…" />}
                {exp.data?.expenses.length === 0 && <EmptyRow cols={6} text={`No expenses recorded for ${year}.`} />}
                {(exp.data?.expenses || []).map((x) => (
                  <tr key={x._id} className="hover:bg-surface-container-low">
                    <td className={`${tdCls} font-mono text-on-surface-variant`}>{x.voucherNo || x._id.slice(-6)}</td>
                    <td className={tdCls}>{fullDate(x.date)}</td>
                    <td className={tdCls}><div className="font-label-md text-label-md font-bold">{x.payee || x.description || "—"}</div>{x.payee && x.description && <div className="font-body-sm text-body-sm text-on-surface-variant">{x.description}</div>}</td>
                    <td className={tdCls}><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${accentFor(x.category).chip}`}>{x.category}</span></td>
                    <td className={`${tdCls} text-right font-bold`}>{kes(x.amount)}</td>
                    <td className={`${tdCls} text-right`}>
                      <button aria-label="Delete expense" className="p-1.5 text-outline hover:text-error" onClick={async () => {
                        if (!window.confirm(`Delete ${x.voucherNo || "this expense"} (${kes(x.amount)})? This cannot be undone.`)) return;
                        await api.delete(`/expenses/${x._id}`); exp.reload();
                      }}><Icon name="delete" className="text-[20px]" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {modal?.kind === "invest" && <InvestModal onClose={() => setModal(null)} onSaved={done} />}
      {modal?.kind === "return" && <ReturnModal item={modal.item} onClose={() => setModal(null)} onSaved={done} />}
      {modal?.kind === "value" && <ValueModal item={modal.item} onClose={() => setModal(null)} onSaved={done} />}
      {modal?.kind === "expense" && <ExpenseModal known={Object.keys(exp.data?.byCategory || {})} onClose={() => setModal(null)} onSaved={done} />}
    </div>
  );
}

// One small form shell shared by the four dialogs
function FormModal({ title, subtitle, icon, onClose, onSubmit, children, cta = "Save", size = "max-w-lg" }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    setErr(""); setSaving(true);
    try { const msg = await onSubmit(); toast(msg); } catch (e) { setErr(e.response?.data?.message || e.message || "Could not save."); setSaving(false); }
  };
  return (
    <Modal title={title} subtitle={subtitle} icon={icon} onClose={onClose} size={size}
      footer={<><button className={btnSecondary} onClick={onClose}>Cancel</button><button className={btnPrimary} onClick={go} disabled={saving}>{saving ? "Saving…" : cta}</button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
      {err && <p role="alert" className="mt-4 p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">{err}</p>}
    </Modal>
  );
}

function InvestModal({ onClose, onSaved }) {
  const [f, setF] = useState({ name: "", type: "money_market", amountInvested: "", dateInvested: isoDate(), expectedYield: "", horizon: "", note: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <FormModal title="New investment" icon="add_chart" onClose={onClose} cta="Record investment"
      onSubmit={async () => { await api.post("/investments", { ...f, amountInvested: Number(f.amountInvested), expectedYield: Number(f.expectedYield) || undefined }); onSaved(); return "Investment recorded"; }}>
      <Field label="Name" className="sm:col-span-2"><input className={inputCls} value={f.name} onChange={set("name")} placeholder="e.g. Plot in Kitengela" /></Field>
      <Field label="Type"><select className={inputCls} value={f.type} onChange={set("type")}>{Object.entries(INV_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="Amount invested (KES)"><input type="number" min="1" className={inputCls} value={f.amountInvested} onChange={set("amountInvested")} /></Field>
      <Field label="Date invested"><input type="date" className={inputCls} value={f.dateInvested} onChange={set("dateInvested")} /></Field>
      <Field label="Expected yield (% a year)"><input type="number" min="0" step="0.1" className={inputCls} value={f.expectedYield} onChange={set("expectedYield")} /></Field>
      <Field label="Period" className="sm:col-span-2"><input className={inputCls} value={f.horizon} onChange={set("horizon")} placeholder="e.g. 3 years" /></Field>
      <Field label="Notes" className="sm:col-span-2"><input className={inputCls} value={f.note} onChange={set("note")} /></Field>
    </FormModal>
  );
}

function ReturnModal({ item, onClose, onSaved }) {
  const [f, setF] = useState({ amount: "", date: isoDate(), note: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <FormModal title="Add income" subtitle={item.name} icon="payments" onClose={onClose} size="max-w-md" cta="Record income"
      onSubmit={async () => { await api.post(`/investments/${item._id}/returns`, { ...f, amount: Number(f.amount) }); onSaved(); return "Income recorded"; }}>
      <Field label="Amount received (KES)"><input type="number" min="1" className={inputCls} value={f.amount} onChange={set("amount")} /></Field>
      <Field label="Date received"><input type="date" className={inputCls} value={f.date} onChange={set("date")} /></Field>
      <Field label="Note" className="sm:col-span-2" hint="Rent, interest, dividend…"><input className={inputCls} value={f.note} onChange={set("note")} /></Field>
    </FormModal>
  );
}

function ValueModal({ item, onClose, onSaved }) {
  const [value, setValue] = useState(String(item.currentValue));
  const [sold, setSold] = useState(false);
  return (
    <FormModal title="Update value" subtitle={item.name} icon="monitoring" onClose={onClose} size="max-w-md"
      onSubmit={async () => { await api.put(`/investments/${item._id}`, { currentValue: Number(value), status: sold ? "sold" : "active" }); onSaved(); return "Investment updated"; }}>
      <Field label="Value today (KES)" className="sm:col-span-2"><input type="number" min="0" className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} /></Field>
      <label className="sm:col-span-2 flex items-center gap-2 font-label-md text-label-md"><input type="checkbox" className="w-4 h-4 accent-primary-container" checked={sold} onChange={(e) => setSold(e.target.checked)} /> This investment has been sold</label>
    </FormModal>
  );
}

function ExpenseModal({ known, onClose, onSaved }) {
  const [f, setF] = useState({ category: "", payee: "", amount: "", date: isoDate(), description: "", reference: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const options = [...new Set([...CATEGORIES, ...known])];
  return (
    <FormModal title="Record an expense" icon="receipt_long" onClose={onClose} cta="Record expense"
      onSubmit={async () => { await api.post("/expenses", { ...f, amount: Number(f.amount) }); onSaved(); return "Expense recorded"; }}>
      <Field label="Category"><input className={inputCls} list="expense-categories" value={f.category} onChange={set("category")} placeholder="Choose or type" /><datalist id="expense-categories">{options.map((c) => <option key={c} value={c} />)}</datalist></Field>
      <Field label="Paid to"><input className={inputCls} value={f.payee} onChange={set("payee")} /></Field>
      <Field label="Amount (KES)"><input type="number" min="1" className={inputCls} value={f.amount} onChange={set("amount")} /></Field>
      <Field label="Date"><input type="date" className={inputCls} value={f.date} onChange={set("date")} /></Field>
      <Field label="What was it for?" className="sm:col-span-2"><input className={inputCls} value={f.description} onChange={set("description")} /></Field>
      <Field label="Receipt or M-Pesa reference" className="sm:col-span-2"><input className={`${inputCls} uppercase`} value={f.reference} onChange={set("reference")} /></Field>
    </FormModal>
  );
}
