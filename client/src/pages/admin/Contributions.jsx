import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import useFetch from "../../hooks/useFetch";
import Icon from "../../components/Icon";
import { useToast } from "../../components/Toast";
import {
  PageHeader, StatCard, Modal, Field, Loading, ErrorNote, Avatar,
  inputCls, btnPrimary, btnSecondary, thCls,
} from "../../components/ui";
import { kes, MONTHS } from "../../utils/format";
import { compactKes, isoDate } from "../../utils/dates";
import { downloadCsv } from "../../utils/csv";

const STATE_STYLE = {
  paid: "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant",
  partial: "bg-warning-container text-on-warning-container",
  overdue: "bg-error-container text-on-error-container",
  pending: "bg-surface-container-high text-on-surface-variant",
  future: "text-outline",
  none: "text-outline-variant",
};

// Works out each month's state for one member row
function analyse(row, { expected, year, dueDay, today }) {
  const joined = row.joinDate ? new Date(row.joinDate) : null;
  const firstMonth =
    joined && joined.getFullYear() === year ? joined.getMonth() + 1 + (joined.getDate() > dueDay ? 1 : 0)
    : joined && joined.getFullYear() > year ? 13 : 1;
  const thisYear = today.getFullYear();

  let paidCount = 0, dueCount = 0, owed = 0;
  const states = row.months.map((amount, i) => {
    const m = i + 1;
    if (m < firstMonth && amount === 0) return "none";
    const future = year > thisYear || (year === thisYear && m > today.getMonth() + 1);
    if (expected > 0) {
      const duePassed = year < thisYear || (year === thisYear && today > new Date(year, m - 1, dueDay, 23, 59, 59));
      const settled = amount >= expected;
      if (settled || duePassed) {
        dueCount++;
        if (settled) paidCount++;
        else owed += expected - amount;
      }
      if (settled) return "paid";
      if (amount > 0) return "partial";
      if (future) return "future";
      return duePassed ? "overdue" : "pending";
    }
    return amount > 0 ? "paid" : future ? "future" : "none";
  });
  return { states, paidCount, dueCount, owed, compliance: dueCount ? Math.round((paidCount / dueCount) * 100) : 100 };
}

export default function Contributions() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [typeCode, setTypeCode] = useState("monthly");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [record, setRecord] = useState(null); // { member?, month? }

  const matrix = useFetch(`/contributions/matrix?year=${year}&type=${typeCode}`);
  const types = useFetch("/contribution-types");
  const members = useFetch("/members");
  const dash = useFetch("/dashboard");

  const m = matrix.data;
  const today = useMemo(() => new Date(), []);

  const analysed = useMemo(() => {
    if (!m) return [];
    const ctx = { expected: m.type.frequency === "monthly" ? m.type.amount : 0, year: m.year, dueDay: m.dueDay, today };
    return m.rows.map((row) => ({ row, ...analyse(row, ctx) }));
  }, [m, today]);

  const expected = m && m.type.frequency === "monthly" ? m.type.amount : 0;
  const totals = useMemo(() => ({
    collected: analysed.reduce((s, a) => s + a.row.total, 0),
    expectedToDate: analysed.reduce((s, a) => s + a.dueCount * expected, 0),
    owed: analysed.reduce((s, a) => s + a.owed, 0),
    behind: analysed.filter((a) => a.owed > 0).length,
    perMonth: Array.from({ length: 12 }, (_, i) => analysed.reduce((s, a) => s + a.row.months[i], 0)),
  }), [analysed, expected]);

  const visible = analysed.filter((a) => {
    const q = query.trim().toLowerCase();
    const hit = !q || a.row.member.name.toLowerCase().includes(q) || (a.row.member.memberNo || "").toLowerCase().includes(q);
    return hit && (tab === "all" || (tab === "ok" && a.owed === 0) || (tab === "arrears" && a.owed > 0));
  });

  const exportCsv = () =>
    downloadCsv(`contributions-${typeCode}-${year}.csv`, visible.map(({ row }) => ({
      "Member No": row.member.memberNo || "", Member: row.member.name,
      ...Object.fromEntries(MONTHS.map((mo, i) => [mo, row.months[i]])), Total: row.total,
    })));

  const pct = totals.expectedToDate ? Math.round((totals.collected / totals.expectedToDate) * 100) : null;

  return (
    <div>
      <PageHeader
        eyebrow="Ledgers"
        title="Contributions matrix"
        subtitle="Twelve months for every member. Click any cell to record a payment for that member and month."
        actions={<>
          <select className={`${inputCls} w-auto`} value={typeCode} onChange={(e) => setTypeCode(e.target.value)} aria-label="Contribution type">
            {(types.data || []).filter((t) => t.isActive).map((t) => <option key={t._id} value={t.code}>{t.name}</option>)}
          </select>
          <select className={`${inputCls} w-auto`} value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
            {[thisYear, thisYear - 1, thisYear - 2].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className={btnSecondary} onClick={exportCsv}><Icon name="download" className="text-[20px]" /> Export</button>
          <button className={btnPrimary} onClick={() => setRecord({})}><Icon name="add_circle" className="text-[20px]" /> Record payment</button>
        </>}
      />

      {matrix.error && <ErrorNote message={matrix.error} onRetry={matrix.reload} />}
      {matrix.loading && !m && <Loading />}

      {m && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon="flag" label="Expected to date" value={expected ? kes(totals.expectedToDate) : "—"}
              note={expected ? `${kes(expected)} per member each month` : "No fixed monthly amount for this type"} />
            <StatCard icon="account_balance_wallet" tone="gold" label={`Collected in ${m.year}`} value={kes(totals.collected)}
              note={pct !== null ? `${pct}% of what is due` : m.type.name} />
            <StatCard icon="warning" tone={totals.owed ? "bad" : "default"} label="Arrears" value={kes(totals.owed)}
              note={totals.behind ? `${totals.behind} member(s) behind` : "Everyone is up to date"} />
            <StatCard icon="diversity_3" label="Welfare fund" value={dash.data ? kes(dash.data.welfareBalance) : "—"} note="Current balance" />
          </section>

          <section className="mt-6 rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
            <div className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between border-b border-outline-variant/40">
              <div className="relative w-full lg:max-w-sm">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                <input className={`${inputCls} pl-10`} placeholder="Search member" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <div className="flex gap-2">
                  {[["all", "All"], ["ok", "Up to date"], ["arrears", "In arrears"]].map(([k, label]) => (
                    <button key={k} onClick={() => setTab(k)}
                      className={`px-3.5 py-2 rounded-full font-label-md text-label-md font-bold ${tab === k ? "bg-primary-container text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 font-label-sm text-label-sm text-on-surface-variant">
                  {[["paid", "Paid"], ["partial", "Partial"], ["overdue", "Overdue"], ["pending", "Not yet due"]].map(([k, label]) => (
                    <span key={k} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded ${STATE_STYLE[k].split(" ")[0]}`} />{label}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[1280px] border-separate border-spacing-0">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className={`${thCls} sticky left-0 z-10 bg-surface-container-low min-w-[220px]`}>Member</th>
                    {MONTHS.map((mo) => <th key={mo} className={`${thCls} text-center px-1`}>{mo}</th>)}
                    <th className={`${thCls} text-right`}>Total</th>
                    <th className={`${thCls} text-right`}>On time</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 && (
                    <tr><td colSpan={15} className="px-4 py-12 text-center text-on-surface-variant font-body-md">No members match.</td></tr>
                  )}
                  {visible.map(({ row, states, compliance }) => (
                    <tr key={row.member.id} className="group">
                      <td className="sticky left-0 z-10 bg-surface-container-lowest group-hover:bg-surface-container-low px-4 py-2 border-b border-outline-variant/30">
                        <div className="flex items-center gap-3">
                          <Avatar name={row.member.name} size="w-8 h-8" />
                          <div className="min-w-0">
                            <div className="font-label-md text-label-md font-bold truncate">{row.member.name}</div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant">{row.member.memberNo ? `#${row.member.memberNo}` : "—"}</div>
                          </div>
                        </div>
                      </td>
                      {row.months.map((amount, i) => {
                        const state = states[i];
                        const label = amount > 0 ? compactKes(amount) : state === "overdue" ? "Due" : state === "pending" ? "Soon" : "—";
                        return (
                          <td key={i} className="px-1 py-2 border-b border-outline-variant/30 text-center">
                            <button
                              onClick={() => setRecord({ member: row.member.id, month: i + 1 })}
                              title={`Record ${MONTHS[i]} payment for ${row.member.name}`}
                              className={`w-full min-w-[52px] h-9 rounded-lg font-label-sm text-label-sm font-bold hover:ring-2 hover:ring-secondary transition ${STATE_STYLE[state]}`}>
                              {label}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 border-b border-outline-variant/30 text-right font-label-lg text-label-lg font-bold">{kes(row.total)}</td>
                      <td className={`px-4 py-2 border-b border-outline-variant/30 text-right font-label-md text-label-md font-bold ${compliance < 100 ? "text-error" : "text-on-tertiary-fixed-variant"}`}>
                        {expected ? `${compliance}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-container-low">
                    <td className="sticky left-0 z-10 bg-surface-container-low px-4 py-3 font-label-md text-label-md font-bold">Collected</td>
                    {totals.perMonth.map((sum, i) => (
                      <td key={i} className="px-1 py-3 text-center">
                        <div className="font-label-sm text-label-sm font-bold">{sum ? compactKes(sum) : "—"}</div>
                        {expected > 0 && sum > 0 && analysed.length > 0 && (
                          <div className="font-body-sm text-[11px] text-on-surface-variant">{Math.round((sum / (analysed.length * expected)) * 100)}%</div>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-label-lg text-label-lg font-bold">{kes(totals.collected)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}

      {record && m && members.data && types.data && (
        <RecordModal
          initial={record} matrix={m} members={members.data} types={types.data}
          onClose={() => setRecord(null)}
          onSaved={() => { setRecord(null); matrix.reload(); dash.reload(); }}
        />
      )}
    </div>
  );
}

function RecordModal({ initial, matrix, members, types, onClose, onSaved }) {
  const toast = useToast();
  const activeTypes = types.filter((t) => t.isActive);
  const start = activeTypes.find((t) => t.code === matrix.type.code) || activeTypes[0];

  const [member, setMember] = useState(initial.member || "");
  const [typeId, setTypeId] = useState(start?._id || "");
  const [month, setMonth] = useState(initial.month || new Date().getMonth() + 1);
  const [year, setYear] = useState(matrix.year);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(isoDate());
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const type = activeTypes.find((t) => t._id === typeId);
  const monthly = type?.frequency === "monthly";
  const row = matrix.rows.find((r) => r.member.id === member);
  const alreadyPaid = monthly && type.code === matrix.type.code && Number(year) === matrix.year && row ? row.months[month - 1] : 0;
  const remaining = monthly && type.amount > 0 ? Math.max(0, type.amount - alreadyPaid) : 0;

  // Suggest the amount still due for that month (or the type's usual amount)
  useEffect(() => {
    setAmount(String((monthly ? remaining || type?.amount : type?.amount) || ""));
  }, [typeId, remaining]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setErr("");
    if (!member) return setErr("Choose the member who paid.");
    if (!(Number(amount) > 0)) return setErr("Enter the amount received.");
    setSaving(true);
    try {
      await api.post("/contributions", {
        member, type: typeId, amount: Number(amount), paidOn, reference,
        year: Number(year), month: monthly ? Number(month) : undefined,
      });
      toast("Payment recorded");
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || "Could not record the payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Record a payment" subtitle="Money received from a member" icon="add_card" onClose={onClose} size="max-w-xl"
      footer={<>
        <button className={btnSecondary} onClick={onClose}>Cancel</button>
        <button className={btnPrimary} onClick={submit} disabled={saving}>{saving ? "Saving…" : "Record payment"}</button>
      </>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Member" className="sm:col-span-2">
          <select className={inputCls} value={member} onChange={(e) => setMember(e.target.value)}>
            <option value="">Select a member…</option>
            {members.filter((x) => x.isActive).map((x) => (
              <option key={x._id} value={x._id}>{x.memberNo ? `#${x.memberNo} · ` : ""}{x.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Contribution type" className="sm:col-span-2">
          <select className={inputCls} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {activeTypes.map((t) => <option key={t._id} value={t._id}>{t.name}{t.amount ? ` (${kes(t.amount)})` : ""}</option>)}
          </select>
        </Field>
        {monthly && (
          <>
            <Field label="For month">
              <select className={inputCls} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((mo, i) => <option key={mo} value={i + 1}>{mo}</option>)}
              </select>
            </Field>
            <Field label="Year">
              <select className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {[matrix.year, matrix.year - 1].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            {member && alreadyPaid > 0 && (
              <p className="sm:col-span-2 p-3 rounded-lg bg-warning-container text-on-warning-container font-body-sm text-body-sm">
                {kes(alreadyPaid)} is already recorded for {MONTHS[month - 1]}.{remaining > 0 ? ` ${kes(remaining)} is still due.` : " This month is fully paid."}
              </p>
            )}
          </>
        )}
        <Field label="Amount received (KES)"><input type="number" min="1" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Date received"><input type="date" className={inputCls} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
        <Field label="M-Pesa code or reference" className="sm:col-span-2" hint="Each code can only be recorded once.">
          <input className={`${inputCls} uppercase`} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. SJK4L9X2QP" />
        </Field>
      </div>
      {err && <p role="alert" className="mt-4 p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">{err}</p>}
    </Modal>
  );
}
