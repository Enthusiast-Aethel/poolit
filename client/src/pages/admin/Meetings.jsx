import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import useFetch from "../../hooks/useFetch";
import Icon from "../../components/Icon";
import { useToast } from "../../components/Toast";
import { PageHeader, StatCard, Pill, Avatar, Modal, Field, Loading, ErrorNote, inputCls, btnPrimary, btnNavy, btnSecondary, btnDanger, thCls, tdCls } from "../../components/ui";
import { kes } from "../../utils/format";
import { fullDate, isoDate } from "../../utils/dates";
import { ROLE_LABEL } from "../../utils/labels";

const STATUS_BTN = [["present", "Present", "bg-tertiary-fixed text-on-tertiary-fixed-variant"], ["apology", "Apology", "bg-warning-container text-on-warning-container"], ["absent", "Absent", "bg-error-container text-on-error-container"]];
const AGENDA_STATUS = { open: "Open", closed: "Closed", action_pending: "Action pending" };
const ACTION_STATUS = { open: "Not started", in_progress: "In progress", done: "Done" };

export default function Meetings() {
  const list = useFetch("/meetings");
  const [selId, setSelId] = useState(null);
  const [modal, setModal] = useState(null); // "new" | "edit"
  const meetings = list.data?.meetings || [];
  const stats = list.data?.stats;

  useEffect(() => { if (!selId && meetings.length) setSelId(meetings[0]._id); }, [meetings, selId]);
  const detail = useFetch(selId ? `/meetings/${selId}` : null, { skip: !selId });
  const m = detail.data;
  const reload = () => { list.reload(); detail.reload(); };

  return (
    <div>
      <PageHeader
        eyebrow="Governance"
        title="Meetings & attendance"
        subtitle="Call the roll, record minutes and resolutions, follow up action items and fine members who missed the meeting."
        actions={<>
          {meetings.length > 0 && (
            <select className={`${inputCls} w-auto max-w-xs`} value={selId || ""} onChange={(e) => setSelId(e.target.value)} aria-label="Meeting">
              {meetings.map((x) => <option key={x._id} value={x._id}>{fullDate(x.date)} · {x.title}</option>)}
            </select>
          )}
          <button className={btnPrimary} onClick={() => setModal("new")}><Icon name="add" className="text-[20px]" /> New meeting</button>
        </>}
      />

      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <Loading />}

      {stats && (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon="event_available" label="Meetings this year" value={stats.sittingsThisYear} />
          <StatCard icon="groups" label="Average attendance" value={stats.averageQuorum === null ? "—" : `${stats.averageQuorum}%`} note={stats.quorumRequired > 0 ? `Quorum is ${stats.quorumRequired}%` : "No quorum rule set"} />
          <StatCard icon="assignment_turned_in" label="Open action items" value={stats.openActions} />
          <StatCard icon="gavel" tone="gold" label="Absence fines collected" value={kes(stats.absenceFinesCollected)} note="This year" />
        </section>
      )}

      {list.data && meetings.length === 0 && (
        <div className="mt-6 rounded-xl bg-surface-container-lowest shadow-sm p-10 text-center">
          <Icon name="event" className="text-secondary text-[40px]" />
          <h2 className="mt-2 font-headline-sm text-headline-sm font-bold text-primary-container">No meetings yet</h2>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">Create the first one to start recording attendance.</p>
          <button className={`${btnPrimary} mt-5`} onClick={() => setModal("new")}>New meeting</button>
        </div>
      )}

      {m && <MeetingBody key={m._id} meeting={m} quorum={stats?.quorumRequired || 0} onChanged={reload} onEdit={() => setModal("edit")} />}

      {modal && <MeetingForm meeting={modal === "edit" ? m : null} onClose={() => setModal(null)}
        onSaved={(saved) => { setModal(null); if (modal === "new") setSelId(saved._id); list.reload(); detail.reload(); }} />}
    </div>
  );
}

function MeetingBody({ meeting, quorum, onChanged, onEdit }) {
  const toast = useToast();
  const [tab, setTab] = useState("attendance");
  const [status, setStatus] = useState(() => Object.fromEntries(meeting.attendance.map((a) => [a.member._id, a.status])));
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const saved = Object.fromEntries(meeting.attendance.map((a) => [a.member._id, a.status]));
  const dirty = JSON.stringify(status) !== JSON.stringify(saved);
  // after a save (or fines) the server copy changes, so pick up the fresh roll call
  useEffect(() => { setStatus(Object.fromEntries(meeting.attendance.map((a) => [a.member._id, a.status]))); }, [meeting.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = (s) => Object.values(status).filter((x) => x === s).length;
  const total = meeting.attendance.length;
  const pct = total ? Math.round((count("present") / total) * 1000) / 10 : 0;

  const rows = meeting.attendance.filter((a) => {
    const q = query.trim().toLowerCase();
    return (filter === "all" || status[a.member._id] === filter) && (!q || a.member.name.toLowerCase().includes(q) || (a.member.memberNo || "").toLowerCase().includes(q));
  });

  const run = async (fn, msg) => {
    setBusy(true);
    try { const r = await fn(); toast(typeof msg === "function" ? msg(r) : msg); onChanged(); }
    catch (e) { toast(e.response?.data?.message || "That did not work. Try again.", "error"); }
    finally { setBusy(false); }
  };
  const saveRoll = () => run(() => api.put(`/meetings/${meeting._id}/attendance`, { attendance: Object.entries(status).map(([member, s]) => ({ member, status: s })) }), "Roll call saved");
  const remind = () => {
    if (!window.confirm("Text every active member the date, time and venue of this meeting?")) return;
    run(() => api.post(`/meetings/${meeting._id}/remind`), (r) => `Reminder sent to ${r.data.sent} member(s)${r.data.failed ? `, ${r.data.failed} failed` : ""}`);
  };
  const fine = () => {
    if (!window.confirm(`Fine every member marked Absent? Apologies are not fined.`)) return;
    run(() => api.post(`/meetings/${meeting._id}/fines`), (r) => `${r.data.finesIssued} fine(s) of ${kes(r.data.amountEach)} issued`);
  };

  return (
    <div className="mt-6 flex flex-col gap-6">
      <section className="rounded-xl bg-primary-container text-on-primary p-6 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h2 className="font-headline-md text-headline-md font-bold">{meeting.title}</h2>
            <p className="mt-1 font-body-md text-body-md text-primary-fixed-dim flex flex-wrap gap-x-4 gap-y-1">
              <span><Icon name="calendar_month" className="text-[16px] align-text-bottom" /> {fullDate(meeting.date)}{meeting.startTime ? ` at ${meeting.startTime}` : ""}</span>
              {meeting.location && <span><Icon name="location_on" className="text-[16px] align-text-bottom" /> {meeting.location}</span>}
              {meeting.presiding && <span><Icon name="person" className="text-[16px] align-text-bottom" /> {meeting.presiding}</span>}
            </p>
            {meeting.agenda && <p className="mt-2 font-body-sm text-body-sm text-primary-fixed-dim max-w-3xl">{meeting.agenda}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {quorum > 0 && <Pill tone={pct >= quorum ? "good" : "bad"}>{pct >= quorum ? "Quorum formed" : "No quorum yet"}</Pill>}
            <span className="font-label-md text-label-md">{count("present")} of {total} present ({pct}%)</span>
            <button onClick={remind} disabled={busy} className="px-3 py-1.5 rounded-lg bg-surface-container-lowest/10 font-label-md text-label-md font-bold hover:bg-surface-container-lowest/20 disabled:opacity-50"><Icon name="sms" className="text-[16px] align-text-bottom" /> Text reminder</button>
            <button onClick={onEdit} className="px-3 py-1.5 rounded-lg bg-surface-container-lowest/10 font-label-md text-label-md font-bold hover:bg-surface-container-lowest/20"><Icon name="edit" className="text-[16px] align-text-bottom" /> Edit</button>
          </div>
        </div>
      </section>

      <div className="flex gap-2">
        {[["attendance", "Attendance"], ["minutes", "Minutes & action items"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-full font-label-md text-label-md font-bold ${tab === k ? "bg-primary-container text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>{label}</button>
        ))}
      </div>

      {tab === "attendance" ? (
        <section className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
          <div className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between border-b border-outline-variant/40">
            <div className="flex flex-wrap gap-2">
              {[["all", `All (${total})`], ["present", `Present (${count("present")})`], ["apology", `Apology (${count("apology")})`], ["absent", `Absent (${count("absent")})`]].map(([k, label]) => (
                <button key={k} onClick={() => setFilter(k)} className={`px-3.5 py-2 rounded-full font-label-md text-label-md font-bold ${filter === k ? "bg-primary-container text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>{label}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative"><Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" /><input className={`${inputCls} pl-10`} placeholder="Search member" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
              <button className={btnNavy} onClick={saveRoll} disabled={!dirty || busy}><Icon name="save" className="text-[20px]" /> Save roll call</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[640px]">
              <thead className="bg-surface-container-low"><tr><th className={thCls}>No.</th><th className={thCls}>Member</th><th className={thCls}>Attendance</th><th className={thCls}>Fine</th></tr></thead>
              <tbody className="divide-y divide-outline-variant/30">
                {rows.map((a) => {
                  const id = a.member._id;
                  return (
                    <tr key={id}>
                      <td className={`${tdCls} font-mono text-on-surface-variant`}>{a.member.memberNo || "—"}</td>
                      <td className={tdCls}><div className="flex items-center gap-3"><Avatar name={a.member.name} size="w-8 h-8" /><div><div className="font-label-lg text-label-lg font-bold">{a.member.name}</div><div className="font-body-sm text-body-sm text-on-surface-variant">{ROLE_LABEL[a.member.role]}</div></div></div></td>
                      <td className={tdCls}>
                        <div className="inline-flex rounded-lg overflow-hidden ring-1 ring-outline-variant/50">
                          {STATUS_BTN.map(([k, label, on]) => (
                            <button key={k} disabled={a.fined} onClick={() => setStatus({ ...status, [id]: k })}
                              className={`px-3 py-1.5 font-label-sm text-label-sm font-bold transition-colors disabled:cursor-not-allowed ${status[id] === k ? on : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container"}`}>{label}</button>
                          ))}
                        </div>
                      </td>
                      <td className={tdCls}>{a.fined ? <Pill tone="bad">Fined</Pill> : <span className="text-outline">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="font-body-sm text-body-sm text-on-surface-variant">{dirty ? "Save the roll call before fining absentees." : `${count("absent")} absent, ${count("apology")} with apologies.`}</p>
            <button className={btnDanger} onClick={fine} disabled={dirty || busy || count("absent") === 0}><Icon name="gavel" className="text-[20px]" /> Fine absentees</button>
          </div>
        </section>
      ) : (
        <MinutesEditor key={meeting.updatedAt} meeting={meeting} onChanged={onChanged} />
      )}
    </div>
  );
}

function MinutesEditor({ meeting, onChanged }) {
  const toast = useToast();
  const [agendaItems, setAgenda] = useState(() => meeting.agendaItems.map((x) => ({ ...x })));
  const [actionItems, setActions] = useState(() => meeting.actionItems.map((x) => ({ ...x, dueDate: x.dueDate ? isoDate(x.dueDate) : "" })));
  const [minutes, setMinutes] = useState(meeting.minutes || "");
  const [saving, setSaving] = useState(false);
  const dirty = useMemo(() => JSON.stringify([agendaItems, actionItems, minutes]) !== JSON.stringify([meeting.agendaItems.map((x) => ({ ...x })), meeting.actionItems.map((x) => ({ ...x, dueDate: x.dueDate ? isoDate(x.dueDate) : "" })), meeting.minutes || ""]), [agendaItems, actionItems, minutes, meeting]);

  const upd = (setter, list, i, patch) => setter(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/meetings/${meeting._id}`, {
        minutes,
        agendaItems: agendaItems.filter((x) => x.title?.trim()),
        actionItems: actionItems.filter((x) => x.task?.trim()).map((x) => ({ ...x, dueDate: x.dueDate || undefined })),
      });
      toast("Minutes saved");
      onChanged();
    } catch (e) { toast(e.response?.data?.message || "Could not save the minutes.", "error"); setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl bg-surface-container-lowest shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-headline-sm text-headline-sm font-bold text-primary-container">Agenda & resolutions</h2>
          <button className={btnSecondary} onClick={() => setAgenda([...agendaItems, { title: "", discussion: "", resolution: "", status: "open" }])}><Icon name="add" className="text-[20px]" /> Add item</button>
        </div>
        {agendaItems.length === 0 && <p className="font-body-md text-on-surface-variant">No agenda items yet.</p>}
        <div className="flex flex-col gap-4">
          {agendaItems.map((x, i) => (
            <div key={i} className="rounded-xl bg-surface-container-low p-4 grid grid-cols-1 md:grid-cols-[1fr_11rem_auto] gap-3">
              <Field label={`Item ${i + 1}`}><input className={inputCls} value={x.title} onChange={(e) => upd(setAgenda, agendaItems, i, { title: e.target.value })} placeholder="What was discussed" /></Field>
              <Field label="Status"><select className={inputCls} value={x.status} onChange={(e) => upd(setAgenda, agendaItems, i, { status: e.target.value })}>{Object.entries(AGENDA_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <button className="self-end p-2.5 text-outline hover:text-error" aria-label="Remove item" onClick={() => setAgenda(agendaItems.filter((_, j) => j !== i))}><Icon name="delete" /></button>
              <Field label="Discussion" className="md:col-span-3"><textarea rows={2} className={`${inputCls} h-auto py-2`} value={x.discussion || ""} onChange={(e) => upd(setAgenda, agendaItems, i, { discussion: e.target.value })} /></Field>
              <Field label="Resolution" className="md:col-span-3"><input className={inputCls} value={x.resolution || ""} onChange={(e) => upd(setAgenda, agendaItems, i, { resolution: e.target.value })} placeholder="What was decided, who proposed and seconded" /></Field>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-surface-container-lowest shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-headline-sm text-headline-sm font-bold text-primary-container">Action items</h2>
          <button className={btnSecondary} onClick={() => setActions([...actionItems, { task: "", assignee: "", dueDate: "", status: "open", notes: "" }])}><Icon name="add" className="text-[20px]" /> Add action</button>
        </div>
        {actionItems.length === 0 && <p className="font-body-md text-on-surface-variant">No action items yet.</p>}
        <div className="flex flex-col gap-3">
          {actionItems.map((x, i) => (
            <div key={i} className="rounded-xl bg-surface-container-low p-4 grid grid-cols-1 md:grid-cols-[2fr_1fr_9rem_9rem_auto] gap-3 items-end">
              <Field label="Task"><input className={inputCls} value={x.task} onChange={(e) => upd(setActions, actionItems, i, { task: e.target.value })} /></Field>
              <Field label="Who"><input className={inputCls} value={x.assignee || ""} onChange={(e) => upd(setActions, actionItems, i, { assignee: e.target.value })} /></Field>
              <Field label="Due"><input type="date" className={inputCls} value={x.dueDate} onChange={(e) => upd(setActions, actionItems, i, { dueDate: e.target.value })} /></Field>
              <Field label="Status"><select className={inputCls} value={x.status} onChange={(e) => upd(setActions, actionItems, i, { status: e.target.value })}>{Object.entries(ACTION_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <button className="p-2.5 text-outline hover:text-error" aria-label="Remove action" onClick={() => setActions(actionItems.filter((_, j) => j !== i))}><Icon name="delete" /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-surface-container-lowest shadow-sm p-5">
        <Field label="Other notes for the minutes"><textarea rows={4} className={`${inputCls} h-auto py-2`} value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
      </section>
      <div className="flex justify-end"><button className={btnPrimary} onClick={save} disabled={!dirty || saving}>{saving ? "Saving…" : "Save minutes"}</button></div>
    </div>
  );
}

function MeetingForm({ meeting, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({
    title: meeting?.title || "", date: meeting ? isoDate(meeting.date) : isoDate(), startTime: meeting?.startTime || "",
    location: meeting?.location || "", presiding: meeting?.presiding || "", agenda: meeting?.agenda || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    setErr("");
    if (!f.title.trim() || !f.date) return setErr("A title and date are required.");
    setSaving(true);
    try {
      const { data } = meeting ? await api.put(`/meetings/${meeting._id}`, f) : await api.post("/meetings", f);
      toast(meeting ? "Meeting updated" : "Meeting created");
      onSaved(data);
    } catch (e) { setErr(e.response?.data?.message || "Could not save the meeting."); setSaving(false); }
  };
  return (
    <Modal title={meeting ? "Edit meeting" : "New meeting"} icon="event" onClose={onClose} size="max-w-xl"
      footer={<><button className={btnSecondary} onClick={onClose}>Cancel</button><button className={btnPrimary} onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Title" className="sm:col-span-2"><input className={inputCls} value={f.title} onChange={set("title")} placeholder="e.g. November monthly meeting" /></Field>
        <Field label="Date"><input type="date" className={inputCls} value={f.date} onChange={set("date")} /></Field>
        <Field label="Start time"><input type="time" className={inputCls} value={f.startTime} onChange={set("startTime")} /></Field>
        <Field label="Venue"><input className={inputCls} value={f.location} onChange={set("location")} /></Field>
        <Field label="Presiding"><input className={inputCls} value={f.presiding} onChange={set("presiding")} /></Field>
        <Field label="Agenda" className="sm:col-span-2"><textarea rows={3} className={`${inputCls} h-auto py-2`} value={f.agenda} onChange={set("agenda")} /></Field>
      </div>
      {err && <p role="alert" className="mt-4 p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">{err}</p>}
    </Modal>
  );
}
