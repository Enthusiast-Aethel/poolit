import { useMemo, useState } from "react";
import api from "../../api/client";
import useFetch from "../../hooks/useFetch";
import Icon from "../../components/Icon";
import IssueFineModal from "../../components/IssueFineModal";
import { useToast } from "../../components/Toast";
import {
  PageHeader, StatCard, Pill, Avatar, Modal, Field, Loading, ErrorNote, EmptyRow,
  inputCls, btnPrimary, btnSecondary, btnNavy, thCls, tdCls,
} from "../../components/ui";
import { kes } from "../../utils/format";
import { fullDate, compactKes } from "../../utils/dates";
import { downloadCsv } from "../../utils/csv";
import { ROLE_LABEL } from "../../utils/labels";


export default function Members() {
  const { data, loading, error, reload } = useFetch("/members/overview");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null); // { member } while the add/edit dialog is open
  const [fineFor, setFineFor] = useState(null);
  const [secret, setSecret] = useState(null); // temporary password to hand over
  const [ver, setVer] = useState(0); // bumps to reload the open side panel
  const lists = useFetch("/members");
  const settings = useFetch("/settings");

  const rows = data?.rows || [];
  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.isActive).length,
    savings: rows.reduce((s, r) => s + r.savings, 0),
    loans: rows.reduce((s, r) => s + r.loanBalance, 0),
    arrears: rows.reduce((s, r) => s + r.arrears, 0),
    inArrears: rows.filter((r) => r.isActive && r.arrears > 0).length,
  }), [rows]);

  const visible = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    const hit = !q || r.name.toLowerCase().includes(q) || (r.memberNo || "").toLowerCase().includes(q) || (r.phone || "").includes(q);
    const ok =
      filter === "all" ||
      (filter === "active" && r.isActive) ||
      (filter === "inactive" && !r.isActive) ||
      (filter === "arrears" && r.isActive && r.arrears > 0);
    return hit && ok;
  });

  const refresh = () => { reload(); lists.reload(); setVer((v) => v + 1); };

  const exportCsv = () =>
    downloadCsv("members.csv", visible.map((r) => ({
      "Member No": r.memberNo || "", Name: r.name, Role: ROLE_LABEL[r.role], Phone: r.phone, Email: r.email || "",
      Status: r.isActive ? "Active" : "Inactive", Savings: r.savings, "Loan balance": r.loanBalance,
      Arrears: r.arrears, "Unpaid fines": r.unpaidFines, "Borrowing power": r.borrowingPower,
    })));

  const FILTERS = [["all", "All"], ["active", "Active"], ["arrears", "In arrears"], ["inactive", "Inactive"]];

  return (
    <div>
      <PageHeader
        eyebrow="Membership"
        title="Members register"
        subtitle="Everyone in the chama with their savings, loans and standing. Select a member to see the full profile."
        actions={<>
          <button className={btnSecondary} onClick={exportCsv}><Icon name="download" className="text-[20px]" /> Export</button>
          <button className={btnPrimary} onClick={() => setForm({})}><Icon name="person_add" className="text-[20px]" /> Add member</button>
        </>}
      />

      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}

      {data && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon="group" label="Total members" value={stats.total} note={`${stats.active} active, ${stats.total - stats.active} inactive`} />
            <StatCard icon="savings" label="Cumulative savings" value={kes(stats.savings)} note="Monthly contributions to date" />
            <StatCard icon="payments" label="Loans outstanding" value={kes(stats.loans)} note="Active loan balances" />
            <StatCard icon="warning" tone={stats.arrears ? "bad" : "default"} label="Arrears" value={kes(stats.arrears)}
              note={stats.inArrears ? `${stats.inArrears} member(s) behind` : "Everyone is up to date"} />
          </section>

          <section className="mt-6 rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
            <div className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between border-b border-outline-variant/40">
              <div className="relative w-full lg:max-w-sm">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                <input className={`${inputCls} pl-10`} placeholder="Search name, member number or phone" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map(([k, label]) => (
                  <button key={k} onClick={() => setFilter(k)}
                    className={`px-3.5 py-2 rounded-full font-label-md text-label-md font-bold transition-colors ${
                      filter === k ? "bg-primary-container text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[920px]">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className={thCls}>No.</th><th className={thCls}>Member</th><th className={thCls}>Phone</th>
                    <th className={thCls}>Status</th><th className={`${thCls} text-right`}>Savings</th>
                    <th className={`${thCls} text-right`}>Loan balance</th><th className={`${thCls} text-right`}>Arrears</th>
                    <th className={`${thCls} text-right`}>Can borrow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {visible.length === 0 && <EmptyRow cols={8} text="No members match your search." />}
                  {visible.map((r) => (
                    <tr key={r.id} onClick={() => setSelected(r.id)} className="cursor-pointer hover:bg-surface-container-low transition-colors">
                      <td className={`${tdCls} font-mono text-on-surface-variant`}>{r.memberNo || "—"}</td>
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <Avatar name={r.name} size="w-9 h-9" />
                          <div>
                            <div className="font-label-lg text-label-lg font-bold">{r.name}</div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant">{ROLE_LABEL[r.role]}</div>
                          </div>
                        </div>
                      </td>
                      <td className={`${tdCls} text-on-surface-variant`}>{r.phone}</td>
                      <td className={tdCls}>
                        {!r.isActive ? <Pill>Inactive</Pill> : r.arrears > 0 ? <Pill tone="bad">In arrears</Pill> : <Pill tone="good">Active</Pill>}
                      </td>
                      <td className={`${tdCls} text-right font-bold`}>{kes(r.savings)}</td>
                      <td className={`${tdCls} text-right`}>{r.loanBalance ? kes(r.loanBalance) : <span className="text-outline">—</span>}</td>
                      <td className={`${tdCls} text-right ${r.arrears ? "text-error font-bold" : "text-outline"}`}>{r.arrears ? kes(r.arrears) : "—"}</td>
                      <td className={`${tdCls} text-right text-secondary font-bold`}>{r.isActive ? compactKes(r.borrowingPower) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-4 py-3 font-body-sm text-body-sm text-on-surface-variant border-t border-outline-variant/40">
              Showing {visible.length} of {rows.length} members. "Can borrow" is {data.loanMultiplier}x savings minus loans still owed.
            </p>
          </section>
        </>
      )}

      {selected && (
        <MemberDrawer
          key={`${selected}-${ver}`}
          id={selected}
          onClose={() => setSelected(null)}
          onChanged={refresh}
          onEdit={(m) => setForm({ member: m })}
          onFine={(m) => setFineFor(m.id)}
          onSecret={setSecret}
        />
      )}

      {form && (
        <MemberFormModal
          member={form.member}
          onClose={() => setForm(null)}
          onSaved={(result) => {
            setForm(null);
            refresh();
            if (result?.temporaryPassword) setSecret({ name: result.name, phone: result.phone, password: result.temporaryPassword, isNew: true });
          }}
        />
      )}

      {fineFor && lists.data && (
        <IssueFineModal members={lists.data} settings={settings.data} defaultMember={fineFor}
          onClose={() => setFineFor(null)} onSaved={() => { setFineFor(null); refresh(); }} />
      )}

      {secret && <SecretModal secret={secret} onClose={() => setSecret(null)} />}
    </div>
  );
}

/* ---------- side panel ---------- */
function MemberDrawer({ id, onClose, onChanged, onEdit, onFine, onSecret }) {
  const toast = useToast();
  const { data: m, loading, error, reload } = useFetch(`/members/${id}`);
  const [busy, setBusy] = useState(false);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const out = await fn();
      if (okMsg) toast(okMsg);
      return out;
    } catch (e) {
      toast(e.response?.data?.message || "That did not work. Try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    const msg = m.isActive ? `Deactivate ${m.name}? They will no longer be able to sign in.` : `Reactivate ${m.name}?`;
    if (!window.confirm(msg)) return;
    await run(() => api.put(`/members/${id}`, { isActive: !m.isActive }), m.isActive ? "Member deactivated" : "Member reactivated");
    reload();
    onChanged();
  };

  const resetPassword = async () => {
    if (!window.confirm(`Create a new temporary password for ${m.name}? Their old password stops working.`)) return;
    const res = await run(() => api.patch(`/members/${id}/password`, {}));
    if (res) onSecret({ name: m.name, phone: m.phone, password: res.data.temporaryPassword });
  };

  return (
    <Modal side title={m?.name || "Member"} subtitle={m ? `${ROLE_LABEL[m.role]}${m.memberNo ? ` · #${m.memberNo}` : ""}` : ""} icon="person" onClose={onClose}>
      {loading && !m && <Loading />}
      {error && <ErrorNote message={error} onRetry={reload} />}
      {m && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={m.isActive ? "good" : "neutral"}>{m.isActive ? "Active" : "Inactive"}</Pill>
            {m.standing.arrears > 0 && <Pill tone="bad">In arrears</Pill>}
            {!m.registrationPaid && <Pill tone="warn">Registration fee not recorded</Pill>}
            <span className="font-body-sm text-body-sm text-on-surface-variant">Joined {fullDate(m.joinDate)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Tile label="Savings" value={kes(m.savings)} />
            <Tile label="Loan balance" value={kes(m.loanBalance)} />
            <Tile label="Can borrow now" value={kes(m.borrowingPower)} gold />
            <Tile label="Welfare contributed" value={kes(m.welfare)} />
          </div>

          <Section title="Monthly standing">
            <Row label="Monthly contribution" value={kes(m.standing.monthlyAmount)} />
            <Row label="Months behind" value={`${m.standing.unpaidMonths} of ${m.standing.dueMonths} due`} />
            <Row label="Arrears" value={kes(m.standing.arrears)} bad={m.standing.arrears > 0} />
            <Row label="Unpaid fines" value={kes(m.unpaidFines)} bad={m.unpaidFines > 0} />
          </Section>

          <Section title="Contact and identity">
            <Row label="Phone" value={m.phone} />
            <Row label="Email" value={m.email || "—"} />
            <Row label="National ID" value={m.nationalId || "—"} />
            <Row label="Next of kin" value={m.nextOfKin?.name ? `${m.nextOfKin.name}${m.nextOfKin.relationship ? ` (${m.nextOfKin.relationship})` : ""}` : "—"} />
          </Section>

          <Section title="Guaranteeing">
            {m.guarantees.length === 0 && <p className="font-body-sm text-body-sm text-on-surface-variant">Not guaranteeing any open loan.</p>}
            {m.guarantees.map((g) => (
              <div key={g.loanId} className="flex items-center justify-between gap-3 py-1.5">
                <span className="font-body-md text-body-md">{g.borrower?.name}</span>
                <span className="font-label-md text-label-md font-bold">{kes(g.principal)}</span>
              </div>
            ))}
          </Section>

          <div className="grid grid-cols-2 gap-2.5">
            <button className={btnNavy} onClick={() => onEdit(m)}><Icon name="edit" className="text-[20px]" /> Edit details</button>
            <button className={btnSecondary} onClick={() => onFine(m)}><Icon name="gavel" className="text-[20px]" /> Issue fine</button>
            <button className={btnSecondary} onClick={resetPassword} disabled={busy}><Icon name="key" className="text-[20px]" /> Reset password</button>
            {m.role !== "chairperson" && (
              <button className={btnSecondary} onClick={toggleActive} disabled={busy}>
                <Icon name={m.isActive ? "person_off" : "person_check"} className="text-[20px]" /> {m.isActive ? "Deactivate" : "Reactivate"}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

const Tile = ({ label, value, gold }) => (
  <div className={`rounded-xl p-4 ${gold ? "bg-primary-fixed" : "bg-surface-container-low"}`}>
    <p className="font-label-sm text-label-sm text-on-surface-variant font-bold">{label}</p>
    <p className="mt-1 font-headline-sm text-headline-sm font-bold text-primary-container">{value}</p>
  </div>
);
const Section = ({ title, children }) => (
  <div>
    <h4 className="font-label-md text-label-md font-bold uppercase tracking-wider text-on-surface-variant mb-2">{title}</h4>
    <div className="rounded-xl bg-surface-container-low px-4 py-2 divide-y divide-outline-variant/30">{children}</div>
  </div>
);
const Row = ({ label, value, bad }) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <span className="font-body-md text-body-md text-on-surface-variant">{label}</span>
    <span className={`font-label-lg text-label-lg font-bold text-right ${bad ? "text-error" : ""}`}>{value}</span>
  </div>
);

/* ---------- add / edit ---------- */
function MemberFormModal({ member, onClose, onSaved }) {
  const toast = useToast();
  const editing = !!member;
  const [f, setF] = useState({
    name: member?.name || "", phone: member?.phone || "", email: member?.email || "",
    role: member?.role || "member", memberNo: member?.memberNo || "",
    nationalId: "", kinName: member?.nextOfKin?.name || "", kinRel: member?.nextOfKin?.relationship || "",
    smsOptOut: !!member?.smsOptOut,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    setErr("");
    if (!f.name.trim() || !f.phone.trim()) return setErr("Name and phone number are required.");
    setSaving(true);
    const payload = {
      name: f.name, phone: f.phone, email: f.email, role: f.role, memberNo: f.memberNo || undefined,
      nationalId: f.nationalId || undefined, nextOfKin: { name: f.kinName, relationship: f.kinRel },
      ...(editing ? { smsOptOut: f.smsOptOut } : {}),
    };
    try {
      const { data } = editing ? await api.put(`/members/${member.id}`, payload) : await api.post("/auth/users", payload);
      toast(editing ? "Member updated" : "Member added");
      onSaved(data);
    } catch (e) {
      setErr(e.response?.data?.message || "Could not save the member.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? "Edit member" : "Add a member"} subtitle={editing ? member.name : "A temporary password is created for them to sign in"}
      icon={editing ? "edit" : "person_add"} onClose={onClose}
      footer={<>
        <button className={btnSecondary} onClick={onClose}>Cancel</button>
        <button className={btnPrimary} onClick={submit} disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add member"}</button>
      </>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full name" className="sm:col-span-2"><input className={inputCls} value={f.name} onChange={set("name")} /></Field>
        <Field label="Phone number" hint="They sign in with this number."><input className={inputCls} value={f.phone} onChange={set("phone")} placeholder="0722 123 456" /></Field>
        <Field label="Email (optional)"><input type="email" className={inputCls} value={f.email} onChange={set("email")} /></Field>
        <Field label="Member number" hint={editing ? "" : "Leave blank to assign the next number."}>
          <input className={inputCls} value={f.memberNo} onChange={set("memberNo")} />
        </Field>
        <Field label="Role">
          <select className={inputCls} value={f.role} onChange={set("role")} disabled={member?.role === "chairperson"}>
            {member?.role === "chairperson" && <option value="chairperson">Chairperson</option>}
            {["member", "vice_chairperson", "secretary", "treasurer", "supervisory"].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </Field>
        <Field label="National ID number" className="sm:col-span-2" hint={editing ? "Leave blank to keep the number on file." : ""}>
          <input className={inputCls} value={f.nationalId} onChange={set("nationalId")} inputMode="numeric" />
        </Field>
        <Field label="Next of kin"><input className={inputCls} value={f.kinName} onChange={set("kinName")} /></Field>
        <Field label="Relationship"><input className={inputCls} value={f.kinRel} onChange={set("kinRel")} placeholder="Spouse, sibling…" /></Field>
        {editing && (
          <label className="sm:col-span-2 flex items-center gap-2 font-label-md text-label-md">
            <input type="checkbox" className="w-4 h-4 accent-primary-container" checked={f.smsOptOut} onChange={(e) => setF({ ...f, smsOptOut: e.target.checked })} />
            Do not send this member text messages
          </label>
        )}
      </div>
      {err && <p role="alert" className="mt-4 p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">{err}</p>}
    </Modal>
  );
}

/* ---------- temporary password hand-over ---------- */
function SecretModal({ secret, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(secret.password); setCopied(true); } catch { /* clipboard blocked */ }
  };
  return (
    <Modal title={secret.isNew ? "Member added" : "New temporary password"} subtitle={secret.name} icon="key" onClose={onClose} size="max-w-md"
      footer={<button className={btnPrimary} onClick={onClose}>Done</button>}>
      <p className="font-body-md text-body-md text-on-surface-variant">
        Share these sign-in details with {secret.name.split(" ")[0]}. <strong>This password is shown only once.</strong>
      </p>
      <div className="mt-4 rounded-xl bg-surface-container-low p-4 flex flex-col gap-3">
        <div><p className="font-label-sm text-label-sm text-on-surface-variant font-bold">Sign in with</p><p className="font-label-lg text-label-lg font-bold">{secret.phone}</p></div>
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant font-bold">Temporary password</p>
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-headline-sm font-bold text-primary-container select-all">{secret.password}</p>
            <button className={btnSecondary} onClick={copy}><Icon name={copied ? "check" : "content_copy"} className="text-[18px]" />{copied ? "Copied" : "Copy"}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
