import { useEffect, useState } from "react";
import api from "../../api/client";
import useFetch from "../../hooks/useFetch";
import Icon from "../../components/Icon";
import { useToast } from "../../components/Toast";
import {
  PageHeader, StatCard, Pill, Avatar, Modal, Field, Loading, ErrorNote, SectionTabs,
  inputCls, btnPrimary, btnNavy, btnSecondary, thCls, tdCls,
} from "../../components/ui";
import { kes } from "../../utils/format";
import { fullDate, isoDate } from "../../utils/dates";
import { POOL_TABS } from "./Welfare";

export default function MerryGoRound() {
  const toast = useToast();
  const cycles = useFetch("/merry-go-round");
  const types = useFetch("/contribution-types");
  const members = useFetch("/members");
  const [pick, setPick] = useState(null);
  const [modal, setModal] = useState(null); // "start" | "stake" | "pay"

  const list = cycles.data || [];
  useEffect(() => { if (!pick && list.length) setPick((list.find((c) => c.status === "active") || list[0])._id); }, [list, pick]);

  const cycle = useFetch(pick ? `/merry-go-round/${pick}` : null, { skip: !pick });
  const c = cycle.data;
  const refresh = () => { cycles.reload(); cycle.reload(); setModal(null); };

  const type = (types.data || []).find((t) => t.code === "merry_go_round");
  const activeCount = (members.data || []).filter((m) => m.isActive).length;
  const current = c?.rounds.find((r) => r.status === "pending");
  const paidOut = c ? c.rounds.filter((r) => r.status === "paid").reduce((s, r) => s + r.payout, 0) : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Rotating savings"
        title="Merry-go-round"
        subtitle="Members take turns receiving the pot. The order is drawn once by ballot and is locked, so nobody can change it afterwards."
        actions={
          <>
            {list.length > 1 && (
              <select className={`${inputCls} w-auto`} value={pick || ""} onChange={(e) => setPick(e.target.value)} aria-label="Cycle">
                {list.map((x) => <option key={x._id} value={x._id}>{x.name}{x.status === "completed" ? " (finished)" : ""}</option>)}
              </select>
            )}
            {!list.some((x) => x.status === "active") && <button className={btnPrimary} onClick={() => setModal("start")}><Icon name="casino" className="text-[20px]" /> Start a cycle</button>}
          </>
        }
      />
      <SectionTabs tabs={POOL_TABS} />

      {(cycles.error || cycle.error) && <ErrorNote message={cycles.error || cycle.error} onRetry={() => { cycles.reload(); cycle.reload(); }} />}
      {cycles.loading && !cycles.data && <Loading />}

      {cycles.data && list.length === 0 && (
        <div className="rounded-xl bg-surface-container-lowest shadow-sm p-10 text-center">
          <Icon name="sync" className="text-secondary text-[40px]" />
          <h2 className="mt-2 font-headline-sm text-headline-sm font-bold text-primary-container">No cycle yet</h2>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant max-w-lg mx-auto">
            Starting a cycle draws the order for every active member and locks it. Make sure the amount per member is set under Settings first.
          </p>
          <button className={`${btnPrimary} mt-5`} onClick={() => setModal("start")}>Start a cycle</button>
        </div>
      )}

      {c && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon="savings" tone="gold" label="Pot each turn" value={kes(c.rounds[0]?.payout)} note={`${c.rounds.length} members x ${kes(c.amountPerMember)}`} />
            <StatCard icon="sync" label="Current turn" value={current ? `#${current.position} of ${c.rounds.length}` : "Finished"} note={c.name} />
            <StatCard icon="verified" label="Paid out so far" value={kes(paidOut)} note={`${c.rounds.filter((r) => r.status === "paid").length} turn(s) settled`} />
            <StatCard icon="event" label="Next payout" value={current ? fullDate(current.scheduledDate) : "—"} note={current ? `${current.paidBy.length} of ${c.rounds.length} have paid in` : "Cycle complete"} />
          </section>

          {current && (
            <section className="mt-6 rounded-xl bg-primary-container text-on-primary p-6 shadow-md">
              <p className="font-label-sm text-label-sm text-secondary-fixed font-bold tracking-wider uppercase">Next to receive · Turn #{current.position}</p>
              <div className="mt-2 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <Avatar name={current.member.name} size="w-14 h-14" />
                  <div>
                    <h2 className="font-headline-md text-headline-md font-bold">{current.member.name}</h2>
                    <p className="font-body-md text-body-md text-primary-fixed-dim">{current.member.memberNo ? `#${current.member.memberNo}` : ""}{current.member.phone ? ` · ${current.member.phone}` : ""}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div><p className="font-label-sm text-label-sm text-primary-fixed-dim">Pot</p><p className="font-headline-sm text-headline-sm font-bold text-secondary-fixed">{kes(current.payout)}</p></div>
                  <div><p className="font-label-sm text-label-sm text-primary-fixed-dim">Collected</p><p className="font-headline-sm text-headline-sm font-bold">{kes(current.collected)}</p></div>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button className={btnPrimary} onClick={() => setModal("stake")}><Icon name="add_card" className="text-[20px]" /> Record a stake</button>
                  <button className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-lg bg-surface-container-lowest text-primary-container font-label-lg text-label-lg font-bold hover:bg-surface-container" onClick={() => setModal("pay")}>
                    <Icon name="send" className="text-[20px]" /> Mark as paid out
                  </button>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-primary overflow-hidden"><div className="h-full bg-secondary-container" style={{ width: `${Math.min(100, (current.collected / current.payout) * 100)}%` }} /></div>
            </section>
          )}

          <section className="mt-6 rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/40">
              <h2 className="font-headline-sm text-headline-sm font-bold text-primary-container">Order of payout</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Drawn by ballot and locked. One payout each month.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[760px]">
                <thead className="bg-surface-container-low"><tr>
                  <th className={thCls}>Turn</th><th className={thCls}>Member</th><th className={thCls}>Date</th>
                  <th className={`${thCls} text-right`}>Pot</th><th className={`${thCls} text-right`}>Collected</th><th className={thCls}>Status</th>
                </tr></thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {c.rounds.map((r) => (
                    <tr key={r.position} className={r === current ? "bg-primary-fixed" : ""}>
                      <td className={`${tdCls} font-mono font-bold`}>#{String(r.position).padStart(2, "0")}</td>
                      <td className={tdCls}><div className="flex items-center gap-3"><Avatar name={r.member.name} size="w-8 h-8" />
                        <div><div className="font-label-lg text-label-lg font-bold">{r.member.name}</div><div className="font-body-sm text-body-sm text-on-surface-variant">{r.member.memberNo ? `#${r.member.memberNo}` : ""}</div></div></div></td>
                      <td className={tdCls}>{fullDate(r.scheduledDate)}</td>
                      <td className={`${tdCls} text-right`}>{kes(r.payout)}</td>
                      <td className={`${tdCls} text-right`}>{r.status === "paid" ? <span className="text-outline">—</span> : kes(r.collected)}</td>
                      <td className={tdCls}>
                        {r.status === "paid" ? <><Pill tone="good">Paid out</Pill>{r.payoutRef && <span className="ml-2 font-body-sm text-body-sm text-on-surface-variant">{r.payoutRef}</span>}</>
                          : r === current ? <Pill tone="warn">Collecting</Pill> : <Pill>Upcoming</Pill>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className="mt-3 font-body-sm text-body-sm text-on-surface-variant">Members who join after the draw are not added to a running cycle, so the locked order is never altered.</p>
        </>
      )}

      {modal === "start" && <StartModal amount={type?.amount || 0} count={activeCount} onClose={() => setModal(null)} onSaved={(created) => { setPick(created._id); refresh(); }} toast={toast} />}
      {modal === "stake" && c && current && members.data && type && (
        <StakeModal cycle={c} round={current} members={members.data} type={type} onClose={() => setModal(null)} onSaved={refresh} toast={toast} />
      )}
      {modal === "pay" && c && current && <PayoutModal cycle={c} round={current} onClose={() => setModal(null)} onSaved={refresh} toast={toast} />}
    </div>
  );
}

function StartModal({ amount, count, onClose, onSaved, toast }) {
  const [name, setName] = useState(`Cycle ${new Date().getFullYear()}`);
  const [first, setFirst] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const submit = async () => {
    setErr(""); setSaving(true);
    try { const { data } = await api.post("/merry-go-round", { name, firstPayoutDate: first }); toast("The draw is done and the order is locked"); onSaved(data); }
    catch (e) { setErr(e.response?.data?.message || "Could not start the cycle."); setSaving(false); }
  };
  return (
    <Modal title="Start a merry-go-round cycle" subtitle="Random draw, then locked" icon="casino" onClose={onClose} size="max-w-lg"
      footer={<><button className={btnSecondary} onClick={onClose}>Cancel</button><button className={btnNavy} onClick={submit} disabled={saving || !first}>{saving ? "Drawing…" : "Draw and lock the order"}</button></>}>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-surface-container-low p-4 font-body-md text-body-md">
          <strong>{count}</strong> active members x <strong>{kes(amount)}</strong> = a pot of <strong>{kes(amount * count)}</strong> each turn.
          {!amount && <span className="block mt-1 text-error">The amount per member is not set. Set it under Settings, contribution types.</span>}
        </div>
        <Field label="Cycle name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Date of the first payout" hint="Each later turn is paid one month after the one before."><input type="date" className={inputCls} value={first} onChange={(e) => setFirst(e.target.value)} /></Field>
        <p className="p-3 rounded-lg bg-warning-container text-on-warning-container font-body-sm text-body-sm">The draw happens once. After this, the order cannot be changed by anyone.</p>
        {err && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">{err}</p>}
      </div>
    </Modal>
  );
}

function StakeModal({ cycle, round, members, type, onClose, onSaved, toast }) {
  const owing = members.filter((m) => m.isActive && !round.paidBy.includes(m._id));
  const [member, setMember] = useState("");
  const [amount, setAmount] = useState(String(cycle.amountPerMember));
  const [paidOn, setPaidOn] = useState(isoDate());
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const submit = async () => {
    setErr(""); setSaving(true);
    try {
      await api.post("/contributions", { member, type: type._id, amount: Number(amount), paidOn, reference, cycle: cycle._id, round: round.position, year: new Date(paidOn).getFullYear() });
      toast("Stake recorded"); onSaved();
    } catch (e) { setErr(e.response?.data?.message || "Could not record the stake."); setSaving(false); }
  };
  return (
    <Modal title={`Stake for turn #${round.position}`} subtitle={`${owing.length} member(s) still to pay`} icon="add_card" onClose={onClose} size="max-w-md"
      footer={<><button className={btnSecondary} onClick={onClose}>Cancel</button><button className={btnPrimary} onClick={submit} disabled={saving || !member}>{saving ? "Saving…" : "Record stake"}</button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Member"><select className={inputCls} value={member} onChange={(e) => setMember(e.target.value)}>
          <option value="">Select a member…</option>
          {owing.map((m) => <option key={m._id} value={m._id}>{m.memberNo ? `#${m.memberNo} · ` : ""}{m.name}</option>)}
        </select></Field>
        <Field label="Amount (KES)"><input type="number" min="1" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Date received"><input type="date" className={inputCls} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
        <Field label="M-Pesa code or reference"><input className={`${inputCls} uppercase`} value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
        {err && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">{err}</p>}
      </div>
    </Modal>
  );
}

function PayoutModal({ cycle, round, onClose, onSaved, toast }) {
  const short = round.payout - round.collected;
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(isoDate());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const submit = async () => {
    setErr(""); setSaving(true);
    try { await api.patch(`/merry-go-round/${cycle._id}/rounds/${round.position}/pay`, { reference, paidOn }); toast(`Turn #${round.position} marked as paid out`); onSaved(); }
    catch (e) { setErr(e.response?.data?.message || "Could not mark the payout."); setSaving(false); }
  };
  return (
    <Modal title={`Pay out turn #${round.position}`} subtitle={`${round.member.name} · ${kes(round.payout)}`} icon="send" onClose={onClose} size="max-w-md"
      footer={<><button className={btnSecondary} onClick={onClose}>Cancel</button><button className={btnPrimary} onClick={submit} disabled={saving}>{saving ? "Saving…" : "Confirm payout"}</button></>}>
      <div className="flex flex-col gap-4">
        {short > 0 && <p className="p-3 rounded-lg bg-warning-container text-on-warning-container font-body-sm text-body-sm">Only {kes(round.collected)} of the {kes(round.payout)} pot has been recorded. {kes(short)} is still missing.</p>}
        <Field label="Date paid"><input type="date" className={inputCls} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
        <Field label="Payment reference" hint="M-Pesa code or bank reference"><input className={`${inputCls} uppercase`} value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
        {err && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">{err}</p>}
      </div>
    </Modal>
  );
}
