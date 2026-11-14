import { useMemo, useState } from "react";
import api from "../../api/client";
import useFetch from "../../hooks/useFetch";
import Icon from "../../components/Icon";
import IssueFineModal, { FINE_REASONS } from "../../components/IssueFineModal";
import { useToast } from "../../components/Toast";
import {
  PageHeader, StatCard, Pill, Avatar, Loading, ErrorNote, EmptyRow, SectionTabs,
  inputCls, btnPrimary, btnSecondary, thCls, tdCls,
} from "../../components/ui";
import { kes } from "../../utils/format";
import { fullDate } from "../../utils/dates";
import { downloadCsv } from "../../utils/csv";
import { LOAN_TABS } from "./Loans";

const STATUS = { unpaid: ["bad", "Unpaid"], paid: ["good", "Paid"], waived: ["neutral", "Waived"] };

export default function Fines() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch("/fines");
  const members = useFetch("/members");
  const settings = useFetch("/settings");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [reason, setReason] = useState("all");
  const [issuing, setIssuing] = useState(false);

  const fines = data || [];
  const sum = (list) => list.reduce((s, f) => s + f.amount, 0);
  const by = (st) => fines.filter((f) => f.status === st);
  const levied = sum(fines.filter((f) => f.status !== "waived"));
  const collected = sum(by("paid"));
  const recovery = levied ? Math.round((collected / levied) * 100) : null;

  const counts = useMemo(() => ({
    all: fines.length, unpaid: by("unpaid").length, paid: by("paid").length, waived: by("waived").length,
  }), [fines]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = fines.filter((f) => {
    const q = query.trim().toLowerCase();
    const hit = !q || f.member?.name.toLowerCase().includes(q) || (f.fineNo || "").toLowerCase().includes(q);
    return hit && (status === "all" || f.status === status) && (reason === "all" || f.reason === reason);
  });

  const update = async (f, body, msg) => {
    try { await api.patch(`/fines/${f._id}`, body); toast(msg); reload(); }
    catch (e) { toast(e.response?.data?.message || "Could not update the fine.", "error"); }
  };
  const waive = (f) => {
    const note = window.prompt(`Why is ${f.member?.name}'s fine being waived? (optional)`);
    if (note === null) return; // cancelled
    update(f, { status: "waived", ...(note ? { note } : {}) }, "Fine waived");
  };

  const exportCsv = () =>
    downloadCsv("fines.csv", visible.map((f) => ({
      "Fine no": f.fineNo || f._id, Member: f.member?.name, Reason: FINE_REASONS[f.reason], Amount: f.amount,
      Status: STATUS[f.status][1], Issued: fullDate(f.dateIssued), Note: f.note || "",
    })));

  return (
    <div>
      <PageHeader
        eyebrow="Lending"
        title="Loans & penalties"
        subtitle="Penalties under the chama rules. Mark them paid when the money is received, or waive them with a reason."
        actions={<>
          <button className={btnSecondary} onClick={exportCsv}><Icon name="download" className="text-[20px]" /> Export</button>
          <button className={btnPrimary} onClick={() => setIssuing(true)}><Icon name="gavel" className="text-[20px]" /> Issue fine</button>
        </>}
      />
      <SectionTabs tabs={LOAN_TABS} />

      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}

      {data && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon="gavel" label="Fines issued" value={kes(levied)} note={`${fines.length} fines, excluding waived`} />
            <StatCard icon="payments" tone="gold" label="Collected" value={kes(collected)} note={recovery !== null ? `${recovery}% recovered` : "—"} />
            <StatCard icon="hourglass_top" tone={by("unpaid").length ? "bad" : "default"} label="Outstanding" value={kes(sum(by("unpaid")))} note={`${counts.unpaid} unpaid`} />
            <StatCard icon="volunteer_activism" label="Waived" value={kes(sum(by("waived")))} note={`${counts.waived} waived`} />
          </section>

          <section className="mt-6 rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
            <div className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between border-b border-outline-variant/40">
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:max-w-xl">
                <div className="relative flex-1">
                  <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                  <input className={`${inputCls} pl-10`} placeholder="Search member or fine number" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <select className={`${inputCls} sm:w-52`} value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason">
                  <option value="all">All reasons</option>
                  {Object.entries(FINE_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                {[["all", "All"], ["unpaid", "Unpaid"], ["paid", "Paid"], ["waived", "Waived"]].map(([k, label]) => (
                  <button key={k} onClick={() => setStatus(k)}
                    className={`px-3.5 py-2 rounded-full font-label-md text-label-md font-bold ${status === k ? "bg-primary-container text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>
                    {label} <span className="opacity-70">{counts[k]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className={thCls}>Fine</th><th className={thCls}>Member</th><th className={thCls}>Reason</th><th className={thCls}>Issued</th>
                    <th className={`${thCls} text-right`}>Amount</th><th className={thCls}>Status</th><th className={thCls} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {visible.length === 0 && <EmptyRow cols={7} text="No fines match." />}
                  {visible.map((f) => {
                    const [tone, label] = STATUS[f.status];
                    return (
                      <tr key={f._id} className="hover:bg-surface-container-low transition-colors">
                        <td className={`${tdCls} font-mono text-on-surface-variant`}>{f.fineNo || f._id.slice(-6)}</td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-3">
                            <Avatar name={f.member?.name} size="w-9 h-9" />
                            <div>
                              <div className="font-label-lg text-label-lg font-bold">{f.member?.name}</div>
                              <div className="font-body-sm text-body-sm text-on-surface-variant">{f.member?.memberNo ? `#${f.member.memberNo}` : ""}</div>
                            </div>
                          </div>
                        </td>
                        <td className={tdCls}>
                          <div className="font-label-md text-label-md font-bold">{FINE_REASONS[f.reason]}</div>
                          {f.note && <div className="font-body-sm text-body-sm text-on-surface-variant max-w-[260px] truncate" title={f.note}>{f.note}</div>}
                        </td>
                        <td className={`${tdCls} text-on-surface-variant`}>{fullDate(f.dateIssued)}</td>
                        <td className={`${tdCls} text-right font-bold`}>{kes(f.amount)}</td>
                        <td className={tdCls}><Pill tone={tone}>{label}</Pill></td>
                        <td className={`${tdCls} text-right whitespace-nowrap`}>
                          {f.status === "unpaid" && (
                            <div className="inline-flex gap-2">
                              <button onClick={() => update(f, { status: "paid" }, "Marked as paid")} className="px-3 py-1.5 rounded-lg bg-tertiary-fixed/40 text-on-tertiary-fixed-variant font-label-md text-label-md font-bold hover:opacity-80">Mark paid</button>
                              <button onClick={() => waive(f)} className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md font-bold hover:bg-surface-container-high">Waive</button>
                            </div>
                          )}
                          {f.status !== "unpaid" && (
                            <button onClick={() => update(f, { status: "unpaid" }, "Moved back to unpaid")} className="font-label-md text-label-md text-outline hover:text-on-surface underline">Undo</button>
                          )}
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

      {issuing && members.data && (
        <IssueFineModal members={members.data} settings={settings.data} onClose={() => setIssuing(false)} onSaved={() => { setIssuing(false); reload(); }} />
      )}
    </div>
  );
}
