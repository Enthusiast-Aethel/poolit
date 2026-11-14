import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import useFetch from "../../hooks/useFetch";
import Icon from "../../components/Icon";
import { useToast } from "../../components/Toast";
import { PageHeader, StatCard, Pill, Field, Loading, ErrorNote, EmptyRow, inputCls, btnPrimary, btnSecondary, thCls, tdCls } from "../../components/ui";
import { smsInfo } from "../../utils/sms";
import { fullDate } from "../../utils/dates";

const STATUS = { delivered: ["good", "Delivered"], sent: ["good", "Sent"], queued: ["warn", "Sending"], failed: ["bad", "Failed"], not_sent: ["neutral", "Not sent"] };
const EVENTS = [
  ["contributionReceived", "Contribution received", "A member is texted when you record their payment."],
  ["repaymentReceived", "Loan repayment received", "A borrower is texted their new balance."],
  ["loanUpdates", "Loan approved, disbursed or not approved", "The borrower hears the outcome."],
  ["guaranteeRequest", "Guarantee requests", "Each guarantor is asked to open PoolIt and agree or decline."],
  ["fineIssued", "Fines", "A member is told when a fine is issued, including missed-meeting fines."],
  ["welfareUpdates", "Welfare claims paid or not approved", "The member who claimed hears the result."],
  ["reminders", "Reminders", "Contribution and loan instalment reminders, before and after the due date."],
];

export default function Messages() {
  const [tab, setTab] = useState("send");
  const status = useFetch("/sms/status");
  const s = status.data;

  return (
    <div>
      <PageHeader
        eyebrow="Communication"
        title="Messages (SMS)"
        subtitle="Text members about payments, loans and meetings, send announcements, and see what was sent."
      />

      {status.error && <ErrorNote message={status.error} onRetry={status.reload} />}
      {s && !s.configured && <SetupCard />}
      {s?.configured && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon="sms" tone="gold" label="SMS connection" value={s.sandbox ? "Test mode" : "Live"} note={s.sandbox ? "Messages are not sent to real phones" : s.senderId ? `Sender: ${s.senderId}` : "Provider's default sender"} />
          <StatCard icon="account_balance_wallet" label="SMS credit" value={s.balance || "—"} note="From your Africa's Talking account" />
          <StatCard icon={s.enabled ? "notifications_active" : "notifications_off"} label="Automatic messages" value={s.enabled ? "On" : "Off"} note={s.remindersScheduled ? "Daily reminders at 8:00 am" : "Reminders only when you press the button"} />
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {[["send", "Send a message"], ["auto", "Automatic messages"], ["log", "Sent messages"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-full font-label-md text-label-md font-bold ${tab === k ? "bg-primary-container text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>{label}</button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "send" && <Compose configured={!!s?.configured} />}
        {tab === "auto" && <Automatic configured={!!s?.configured} onSaved={status.reload} />}
        {tab === "log" && <Log />}
      </div>
    </div>
  );
}

function SetupCard() {
  return (
    <section className="rounded-xl bg-warning-container text-on-warning-container p-5">
      <div className="flex items-center gap-2"><Icon name="info" fill /><h2 className="font-headline-sm text-headline-sm font-bold">SMS is not connected yet</h2></div>
      <p className="mt-1 font-body-md text-body-md">Automatic messages and announcements need an SMS account. Until then, nothing is sent, but every message the system would have sent is listed under Sent messages.</p>
      <ol className="mt-3 list-decimal pl-5 font-body-md text-body-md flex flex-col gap-1">
        <li>Create an account at <strong>africastalking.com</strong> and add some credit.</li>
        <li>Create an API key in their dashboard.</li>
        <li>On your server, set <code className="font-mono">SMS_PROVIDER=africastalking</code>, <code className="font-mono">AT_USERNAME</code> and <code className="font-mono">AT_API_KEY</code>, then restart.</li>
        <li>To practise first, use the username <code className="font-mono">sandbox</code> with your sandbox key. Nothing reaches real phones.</li>
      </ol>
      <p className="mt-3 font-body-sm text-body-sm">The full steps are in GO-LIVE.md.</p>
    </section>
  );
}

/* ---------- write a message ---------- */
function Compose({ configured }) {
  const toast = useToast();
  const members = useFetch("/members");
  const [audience, setAudience] = useState("all");
  const [picked, setPicked] = useState([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const preview = message.replace(/\{name\}/g, "Grace"); // a typical first name, so the length is a fair estimate
  const info = smsInfo(preview);
  const active = (members.data || []).filter((m) => m.isActive);
  const shown = active.filter((m) => !query.trim() || m.name.toLowerCase().includes(query.toLowerCase()) || (m.memberNo || "").includes(query));
  const count = audience === "selected" ? picked.length : audience === "all" ? active.length : null;

  const send = async () => {
    const who = audience === "all" ? `all ${active.length} active members` : audience === "arrears" ? "every member in arrears" : `${picked.length} selected member(s)`;
    if (!window.confirm(`Send this message to ${who}? Each text is billed by your SMS provider.`)) return;
    setBusy(true);
    try {
      const { data } = await api.post("/sms/broadcast", { audience, memberIds: picked, message });
      toast(`${data.sent} of ${data.total} messages sent${data.failed ? `, ${data.failed} failed (see Sent messages)` : ""}`, data.failed ? "error" : "ok");
      if (!data.failed) setMessage("");
    } catch (e) { toast(e.response?.data?.message || "Could not send.", "error"); }
    finally { setBusy(false); }
  };
  const sendTest = async () => {
    try { const { data } = await api.post("/sms/test"); toast(data.status === "sent" ? `Test message sent to ${data.to}` : `Test failed: ${data.error}`, data.status === "sent" ? "ok" : "error"); }
    catch (e) { toast(e.response?.data?.message || "Could not send the test.", "error"); }
  };
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <section className="rounded-xl bg-surface-container-lowest shadow-sm p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">Who should get it?</span>
          <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[["all", "All members", "Everyone active"], ["arrears", "Members in arrears", "Behind on contributions"], ["selected", "Choose members", "Pick from the list"]].map(([k, label, hint]) => (
              <button key={k} type="button" onClick={() => setAudience(k)} className={`text-left rounded-xl p-3 border-2 ${audience === k ? "border-secondary bg-primary-fixed" : "border-outline-variant/50 hover:border-outline"}`}>
                <div className="font-label-md text-label-md font-bold">{label}</div><div className="font-body-sm text-body-sm text-on-surface-variant">{hint}</div>
              </button>
            ))}
          </div>
        </div>

        {audience === "selected" && (
          <div>
            <input className={inputCls} placeholder="Search members" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl bg-surface-container-low divide-y divide-outline-variant/30">
              {shown.map((m) => (
                <label key={m._id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-container">
                  <input type="checkbox" className="w-4 h-4 accent-primary-container" checked={picked.includes(m._id)} onChange={() => toggle(m._id)} />
                  <span className="font-body-md text-body-md">{m.name}</span><span className="font-body-sm text-body-sm text-on-surface-variant">{m.memberNo ? `#${m.memberNo}` : ""}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{picked.length} selected</p>
          </div>
        )}

        <Field label="Message" hint="Type {name} to put each member's first name in. Members who asked not to be texted are skipped.">
          <textarea rows={5} maxLength={480} className={`${inputCls} h-auto py-2`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Hello {name}, the AGM is on Saturday at 10am in the usual venue." />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-2 font-body-sm text-body-sm text-on-surface-variant">
          <span>about {info.length} characters · {info.segments} SMS part{info.segments === 1 ? "" : "s"} per member{info.unicode ? " (special characters shorten each part)" : ""}</span>
          {count !== null && info.segments > 0 && <span className="font-bold">{count * info.segments} SMS in total</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={send} disabled={!configured || busy || !message.trim() || (audience === "selected" && picked.length === 0)}><Icon name="send" className="text-[20px]" /> {busy ? "Sending…" : "Send message"}</button>
          <button className={btnSecondary} onClick={sendTest} disabled={!configured}><Icon name="smartphone" className="text-[20px]" /> Send a test to my phone</button>
        </div>
      </div>

      <div>
        <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">How it will look</span>
        <div className="mt-2 rounded-3xl bg-surface-container p-4 max-w-sm">
          <div className="rounded-2xl rounded-bl-sm bg-surface-container-lowest p-3 shadow-sm font-body-md text-body-md break-words whitespace-pre-wrap min-h-[3rem]">
            {message.trim() ? preview : <span className="text-outline">Your message appears here.</span>}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- automatic messages ---------- */
function Automatic({ configured, onSaved }) {
  const toast = useToast();
  const settings = useFetch("/settings");
  const tpl = useFetch("/sms/templates");
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => { if (settings.data) setF(structuredClone(settings.data.sms)); }, [settings.data]);
  const dirty = f && settings.data && JSON.stringify(f) !== JSON.stringify(settings.data.sms);

  if (settings.error || tpl.error) return <ErrorNote message={settings.error || tpl.error} onRetry={() => { settings.reload(); tpl.reload(); }} />;
  if (!f || !tpl.data) return <Loading />;

  const setEvent = (k, v) => setF({ ...f, events: { ...f.events, [k]: v } });
  const setTemplate = (key, text) => {
    const next = { ...(f.templates || {}) };
    if (text === tpl.data.defaults[key] || !text.trim()) delete next[key]; else next[key] = text;
    setF({ ...f, templates: next });
  };

  const save = async () => {
    setSaving(true);
    try { await api.put("/settings", { sms: { ...f, reminderDaysBefore: Number(f.reminderDaysBefore) || 0 } }); toast("Message settings saved"); settings.reload(); onSaved(); }
    catch (e) { toast(e.response?.data?.message || "Could not save.", "error"); }
    finally { setSaving(false); }
  };
  const runReminders = async () => {
    if (!window.confirm("Text everyone who owes this month's contribution or a loan instalment now? Anyone already reminded today is skipped.")) return;
    setRunning(true);
    try { const { data } = await api.post("/sms/reminders/run"); toast(`${data.sent} reminder(s) sent${data.failed ? `, ${data.failed} failed` : ""}${data.skipped ? `, ${data.skipped} skipped` : ""}`, data.failed ? "error" : "ok"); }
    catch (e) { toast(e.response?.data?.message || "Could not send reminders.", "error"); }
    finally { setRunning(false); }
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      <section className="rounded-xl bg-surface-container-lowest shadow-sm p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-1 w-5 h-5 accent-primary-container" checked={!!f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} />
          <span>
            <span className="block font-headline-sm text-headline-sm font-bold text-primary-container">Send automatic messages</span>
            <span className="block font-body-md text-body-md text-on-surface-variant">When on, the system texts members as things happen. Every text costs credit. Turn it off any time.</span>
            {!configured && <span className="block mt-1 font-body-sm text-body-sm text-error">SMS is not connected yet, so nothing will actually be sent.</span>}
          </span>
        </label>
      </section>

      <section className="rounded-xl bg-surface-container-lowest shadow-sm p-5">
        <h2 className="font-headline-sm text-headline-sm font-bold text-primary-container mb-3">What to text</h2>
        <div className="divide-y divide-outline-variant/30">
          {EVENTS.map(([k, label, hint]) => (
            <label key={k} className="py-3 flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 w-4 h-4 accent-primary-container" checked={f.events[k] !== false} onChange={(e) => setEvent(k, e.target.checked)} />
              <span><span className="block font-label-lg text-label-lg font-bold">{label}</span><span className="block font-body-sm text-body-sm text-on-surface-variant">{hint}</span></span>
            </label>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-[14rem_1fr] gap-4 items-end">
          <Field label="Remind this many days before"><input type="number" min="0" max="14" className={inputCls} value={f.reminderDaysBefore} onChange={(e) => setF({ ...f, reminderDaysBefore: e.target.value })} /></Field>
          <div className="flex flex-wrap items-center gap-3">
            <button className={btnSecondary} onClick={runReminders} disabled={!configured || running}><Icon name="notifications_active" className="text-[20px]" /> {running ? "Sending…" : "Send reminders now"}</button>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Reminders go to members who owe, once a day at most.</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-surface-container-lowest shadow-sm p-5">
        <h2 className="font-headline-sm text-headline-sm font-bold text-primary-container">Wording</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-3">Change what each text says. Words in {"{braces}"} are filled in for each member.</p>
        <div className="flex flex-col gap-2">
          {Object.keys(tpl.data.defaults).map((key) => {
            const text = f.templates?.[key] ?? tpl.data.defaults[key];
            const custom = f.templates?.[key] !== undefined;
            const info = smsInfo(text);
            return (
              <div key={key} className="rounded-xl bg-surface-container-low">
                <button className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left" onClick={() => setOpen(open === key ? null : key)}>
                  <span className="font-label-lg text-label-lg font-bold">{tpl.data.labels[key]}{custom && <Pill tone="warn"> edited</Pill>}</span>
                  <Icon name={open === key ? "expand_less" : "expand_more"} />
                </button>
                {open === key && (
                  <div className="px-4 pb-4 flex flex-col gap-2">
                    <textarea rows={3} maxLength={320} className={`${inputCls} h-auto py-2`} value={text} onChange={(e) => setTemplate(key, e.target.value)} />
                    <p className="font-body-sm text-body-sm text-on-surface-variant">You can use: {tpl.data.variables[key].map((v) => `{${v}}`).join(" ")}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-body-sm text-on-surface-variant">{info.length} characters before names and amounts are added</span>
                      {custom && <button className="font-label-md text-label-md font-bold text-secondary" onClick={() => setTemplate(key, tpl.data.defaults[key])}>Use the standard wording</button>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {dirty && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:left-64 z-40 bg-primary-container text-on-primary px-4 lg:px-8 py-3 flex items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.18)]">
          <span className="font-label-md text-label-md">You have unsaved changes.</span>
          <div className="flex gap-2">
            <button className="px-4 min-h-[44px] rounded-lg font-label-md text-label-md font-bold text-on-primary-container hover:text-on-primary" onClick={() => setF(structuredClone(settings.data.sms))}>Discard</button>
            <button className={btnPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- what was sent ---------- */
function Log() {
  const [filter, setFilter] = useState("all");
  const logs = useFetch(`/sms/logs${filter === "all" ? "" : `?status=${filter}`}`);
  const rows = logs.data || [];
  const failed = rows.filter((r) => r.status === "failed").length;

  return (
    <section className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
      <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-b border-outline-variant/40">
        <div className="flex flex-wrap gap-2">
          {[["all", "All"], ["sent", "Sent"], ["delivered", "Delivered"], ["failed", "Failed"], ["not_sent", "Not sent"]].map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} className={`px-3.5 py-2 rounded-full font-label-md text-label-md font-bold ${filter === k ? "bg-primary-container text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>{label}</button>
          ))}
        </div>
        <button className={btnSecondary} onClick={logs.reload}><Icon name="refresh" className="text-[20px]" /> Refresh</button>
      </div>
      {logs.error && <div className="p-4"><ErrorNote message={logs.error} onRetry={logs.reload} /></div>}
      {failed > 0 && filter === "all" && <p className="px-4 py-2 bg-error-container text-on-error-container font-body-sm text-body-sm">{failed} message(s) failed. The reason is shown on each row (for example, no credit left or a wrong phone number).</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[820px]">
          <thead className="bg-surface-container-low"><tr><th className={thCls}>When</th><th className={thCls}>To</th><th className={thCls}>Message</th><th className={thCls}>Status</th><th className={`${thCls} text-right`}>Cost</th></tr></thead>
          <tbody className="divide-y divide-outline-variant/30">
            {rows.length === 0 && <EmptyRow cols={5} text={logs.loading ? "Loading…" : "Nothing here yet."} />}
            {rows.map((r) => {
              const [tone, label] = STATUS[r.status] || ["neutral", r.status];
              return (
                <tr key={r._id} className="hover:bg-surface-container-low">
                  <td className={`${tdCls} whitespace-nowrap`}>{fullDate(r.createdAt)}<div className="font-body-sm text-body-sm text-on-surface-variant">{new Date(r.createdAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}</div></td>
                  <td className={tdCls}><div className="font-label-md text-label-md font-bold">{r.member?.name || "—"}</div><div className="font-body-sm text-body-sm text-on-surface-variant">{r.to}</div></td>
                  <td className={`${tdCls} max-w-[360px]`}><div className="line-clamp-2" title={r.message}>{r.message}</div><div className="font-body-sm text-[11px] text-outline">{r.kind}{r.segments > 1 ? ` · ${r.segments} parts` : ""}</div></td>
                  <td className={tdCls}><Pill tone={tone}>{label}</Pill>{r.error && <div className="font-body-sm text-[11px] text-error max-w-[180px]">{r.error}</div>}</td>
                  <td className={`${tdCls} text-right text-on-surface-variant`}>{r.cost || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
