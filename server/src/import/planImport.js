// Turns the raw workbook rows into a checked plan. Pure: no database, no files.
// errors   = must be fixed in the workbook before importing
// warnings = worth a look, but the import can go ahead
import { normalizePhone } from "../utils/phone.js";
import { buildSchedule } from "../utils/loanSchedule.js";

const round = (n) => Math.round(n * 100) / 100;
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const isDate = (d) => d instanceof Date && !isNaN(d);
const monthNo = (name) => MONTHS.findIndex((m) => String(name || "").toLowerCase().trim().slice(0, 3) === m.slice(0, 3)) + 1;
const nameKey = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const ymd = (d) => d.toISOString().slice(0, 10);

const ROLE_FOR_TITLE = [[/vice/i, "vice_chairperson"], [/secretary/i, "secretary"], [/treasurer/i, "treasurer"], [/supervis|committee/i, "supervisory"]];

const WELFARE_CATEGORY = [
  [/bereave|funeral|death/i, "bereavement", ""],
  [/sick|hospital|medic|health/i, "medical", ""],
  [/educat|school|fee/i, "other", "Education: "],
];

const INVESTMENT_TYPE = [
  [/land/i, "land"], [/sacco/i, "sacco"], [/stock|share|equit/i, "shares"],
  [/money|t-?bill|bond|mmf/i, "money_market"], [/business|venture/i, "business"], [/real|rental|propert/i, "real_estate"],
];

// Apply repayments to a schedule, oldest instalment first (the same rule the app uses).
// Cents of rounding left over in a loan the workbook calls cleared are settled.
export function applyRepayments(schedule, repayments, tolerance = 1) {
  const sched = schedule.map((i) => ({ ...i, paid: 0 }));
  const payable = round(sched.reduce((s, i) => s + i.total, 0));
  let applied = 0, excess = 0;
  for (const r of repayments) {
    let left = r.amount;
    for (const i of sched) {
      if (left <= 0) break;
      const due = round(i.total - i.paid);
      if (due <= 0) continue;
      const pay = Math.min(left, due);
      i.paid = round(i.paid + pay);
      left = round(left - pay);
      applied = round(applied + pay);
    }
    if (left > 0) excess = round(excess + left);
  }
  let outstanding = round(payable - applied);
  const cleared = outstanding < tolerance;
  if (cleared) {
    sched.forEach((i) => (i.paid = i.total));
    applied = payable;
    outstanding = 0;
  }
  sched.forEach((i) => (i.status = i.paid >= i.total ? "paid" : i.paid > 0 ? "partial" : "pending"));
  return { schedule: sched, totalPayable: payable, totalPaid: applied, outstanding, cleared, excess };
}

// The template ships with ten pretend members (phones like 0712 000 101). Importing them
// into a real chama by mistake would be a mess, so the importer insists on being told.
const SAMPLE_NAMES = new Set(["wanjiru kamau", "otieno odhiambo", "achieng atieno", "kiprop rotich", "mwende mutua", "hassan mohamed", "njeri mwangi", "barasa wekesa", "fatuma ali", "mutheu kioko"]);
export function looksLikeSample(members) {
  const fakePhone = (p) => /^07\d{2}000\d{3}$/.test(String(p || "").replace(/[\s+]/g, "").replace(/^254/, "0"));
  const fake = members.filter((m) => fakePhone(m.phone)).length;
  const named = members.filter((m) => SAMPLE_NAMES.has(nameKey(m.name))).length;
  return fake >= 3 || named >= 3;
}

export function buildPlan(raw, { today = new Date() } = {}) {
  const errors = [];
  const warnings = [];
  const err = (ref, message) => errors.push({ ref, message });
  const warn = (ref, message) => warnings.push({ ref, message });
  const S = raw.settings;

  /* ---- members ---- */
  const members = [];
  const byId = new Map();
  const byName = new Map();
  const phones = new Map();
  for (const m of raw.members) {
    const id = String(m.id).trim().toUpperCase();
    if (byId.has(id)) { err(m.ref, `Member ID ${id} appears twice`); continue; }
    if (!m.name) { err(m.ref, `${id} has no name`); continue; }
    const phone = normalizePhone(String(m.phone || ""));
    if (!phone) { err(m.cells.phone, `${m.name}: "${m.phone ?? ""}" is not a valid Kenyan phone number`); continue; }
    if (phones.has(phone)) { err(m.cells.phone, `${m.name} and ${phones.get(phone)} have the same phone number`); continue; }
    phones.set(phone, m.name);

    const kinMatch = m.kin ? /^(.*?)\s*\((.*)\)\s*$/.exec(String(m.kin)) : null;
    const rec = {
      id, name: String(m.name).trim(), phone,
      nationalId: m.nationalId ? String(m.nationalId).replace(/\D/g, "") || undefined : undefined,
      joinDate: isDate(m.joinDate) ? m.joinDate : undefined,
      isActive: !/inactive|left|exit|dormant/i.test(String(m.status || "")),
      nextOfKin: m.kin ? { name: kinMatch ? kinMatch[1] : String(m.kin), relationship: kinMatch ? kinMatch[2] : undefined, phone: normalizePhone(String(m.kinPhone || "")) || (m.kinPhone ? String(m.kinPhone) : undefined) } : undefined,
      role: "member",
      opening: num(m.opening),
    };
    if (!isDate(m.joinDate)) warn(m.ref, `${rec.name} has no join date`);
    if (rec.opening < 0) { err(m.cells.opening, `${rec.name}: opening savings cannot be negative`); continue; }
    members.push(rec);
    byId.set(id, rec);
    byName.set(nameKey(rec.name), rec);
  }

  // officials' titles become labels (the chairperson is the one admin account, so it is not touched)
  const officials = [];
  for (const o of S.officials || []) {
    const rule = ROLE_FOR_TITLE.find(([re]) => re.test(o.role));
    const member = byName.get(nameKey(o.name));
    if (!rule) continue;
    if (!member) { warn("Settings officials", `${o.role} "${o.name}" is not in the member list`); continue; }
    member.role = rule[1];
    officials.push({ role: o.role, name: member.name });
  }

  /* ---- savings: opening balances and the contribution ledger ---- */
  const openYear = Number(S.finYear) ? Number(S.finYear) - 1 : today.getFullYear() - 1;
  const contributions = [];
  for (const m of members) {
    if (m.opening > 0) contributions.push({ memberId: m.id, amount: m.opening, year: openYear, paidOn: new Date(Date.UTC(openYear, 11, 31)), opening: true, reference: "OPENING" });
  }
  const seenRef = new Map();
  for (const c of raw.contributions) {
    const id = String(c.memberId).trim().toUpperCase();
    if (!byId.has(id)) { err(c.ref, `Member ${id} is not in the member list`); continue; }
    const month = monthNo(c.month);
    const year = num(c.year);
    if (!month) { err(c.ref, `"${c.month ?? ""}" is not a month`); continue; }
    if (!year) { err(c.ref, "the year is missing"); continue; }
    if (!isDate(c.date)) { err(c.ref, "the date paid is missing or not a date"); continue; }
    if (!(num(c.amount) > 0)) { err(c.ref, "the amount must be more than zero"); continue; }
    const reference = c.code ? String(c.code).trim().toUpperCase() : undefined;
    if (reference) {
      if (seenRef.has(reference)) { err(c.ref, `transaction code ${reference} was already used at ${seenRef.get(reference)}`); continue; }
      seenRef.set(reference, c.ref);
    } else warn(c.ref, "no transaction code");
    contributions.push({ memberId: id, amount: round(num(c.amount)), year, month, paidOn: c.date, reference, kind: "monthly" });
  }

  /* ---- welfare ---- */
  const welfareIn = [];
  const welfareOut = [];
  for (const w of raw.welfare) {
    const id = String(w.memberId).trim().toUpperCase();
    if (!byId.has(id)) { err(w.ref, `Member ${id} is not in the member list`); continue; }
    if (!isDate(w.date)) { err(w.ref, "the date is missing"); continue; }
    if (!(num(w.amount) > 0)) { err(w.ref, "the amount must be more than zero"); continue; }
    if (!w.type) { err(w.ref, "the type is missing"); continue; }
    if (/^contribution/i.test(w.type)) {
      welfareIn.push({ memberId: id, amount: round(num(w.amount)), paidOn: w.date, year: w.date.getFullYear() });
    } else {
      const hit = WELFARE_CATEGORY.find(([re]) => re.test(w.type));
      welfareOut.push({
        memberId: id, amount: round(num(w.amount)), date: w.date, category: hit ? hit[1] : "other",
        note: `${hit ? hit[2] : `${w.type}: `}${w.details || ""}`.trim(),
      });
    }
  }

  /* ---- loans and repayments ---- */
  const loans = [];
  const loanById = new Map();
  for (const l of raw.loans) {
    const id = String(l.id).trim().toUpperCase();
    const memberId = String(l.memberId || "").trim().toUpperCase();
    if (loanById.has(id)) { err(l.ref, `Loan ID ${id} appears twice`); continue; }
    if (!byId.has(memberId)) { err(l.ref, `${id}: member ${memberId || "(blank)"} is not in the member list`); continue; }
    if (!(num(l.amount) > 0)) { err(l.ref, `${id}: the loan amount is missing`); continue; }
    const method = /flat/i.test(l.method) ? "flat" : /reduc/i.test(l.method) ? "reducing" : null;
    if (!method) { err(l.ref, `${id}: interest method "${l.method ?? ""}" must be Flat or Reducing Balance`); continue; }
    const term = Math.round(num(l.term));
    if (term < 1) { err(l.ref, `${id}: repayment period is missing`); continue; }
    if (!isDate(l.issueDate)) { err(l.ref, `${id}: issue date is missing`); continue; }

    let ratePm = num(l.rateUsed) || num(l.rateOverride) || num(S.loanRatePerMonth);
    if (ratePm >= 0.5) ratePm = ratePm / 100; // someone typed 1.5 instead of 1.5%
    if (!(ratePm > 0)) { err(l.ref, `${id}: no interest rate found`); continue; }
    const annual = Math.round(ratePm * 12 * 100 * 10000) / 10000; // the app stores % a year

    const guarantors = [];
    for (const g of [l.guarantor1, l.guarantor2]) {
      if (!g) continue;
      const gm = byName.get(nameKey(g)) || byId.get(String(g).trim().toUpperCase());
      if (!gm) warn(l.ref, `${id}: guarantor "${g}" is not in the member list and was left out`);
      else if (gm.id === memberId) warn(l.ref, `${id}: the borrower is listed as their own guarantor and was left out`);
      else if (!guarantors.includes(gm.id)) guarantors.push(gm.id);
    }

    const schedule = buildSchedule({ principal: round(num(l.amount)), annualRate: annual, months: term, method, startDate: l.issueDate });
    const rec = { loanNo: id, memberId, principal: round(num(l.amount)), interestMethod: method, interestRate: annual, termMonths: term, issueDate: l.issueDate, guarantors, schedule, workbookOutstanding: l.workbookOutstanding, workbookStatus: l.workbookStatus, ref: l.ref };
    loans.push(rec);
    loanById.set(id, rec);
  }

  const repaymentRows = [];
  const seenRep = new Map();
  for (const r of raw.repayments) {
    const loanId = String(r.loanId).trim().toUpperCase();
    const loan = loanById.get(loanId);
    if (!loan) { err(r.ref, `loan ${loanId} is not in the Loans sheet`); continue; }
    if (!isDate(r.date)) { err(r.ref, "the date paid is missing"); continue; }
    if (!(num(r.amount) > 0)) { err(r.ref, "the amount must be more than zero"); continue; }
    const reference = r.code ? String(r.code).trim().toUpperCase() : undefined;
    if (reference) {
      if (seenRep.has(reference)) { err(r.ref, `transaction code ${reference} was already used at ${seenRep.get(reference)}`); continue; }
      seenRep.set(reference, r.ref);
    }
    if (r.memberId && String(r.memberId).trim().toUpperCase() !== loan.memberId) warn(r.ref, `repayment for ${loanId} is filed under ${r.memberId}, but the loan belongs to ${loan.memberId}`);
    if (r.date < loan.issueDate) warn(r.ref, `repayment on ${ymd(r.date)} is before loan ${loanId} was issued (${ymd(loan.issueDate)})`);
    repaymentRows.push({ loanNo: loanId, memberId: loan.memberId, amount: round(num(r.amount)), paidOn: r.date, reference });
  }

  for (const loan of loans) {
    const mine = repaymentRows.filter((r) => r.loanNo === loan.loanNo).sort((a, b) => a.paidOn - b.paidOn);
    const res = applyRepayments(loan.schedule, mine);
    loan.schedule = res.schedule;
    loan.totalPayable = res.totalPayable;
    loan.totalPaid = res.totalPaid;
    loan.outstanding = res.outstanding;
    loan.status = res.cleared ? "cleared" : "active";
    if (res.excess >= 1) warn(loan.ref, `${loan.loanNo} was repaid KES ${res.excess} more than it was worth`);
    const wb = typeof loan.workbookOutstanding === "number" ? loan.workbookOutstanding : null;
    if (wb !== null && Math.abs(wb - res.outstanding) > 1) warn(loan.ref, `${loan.loanNo}: the workbook shows KES ${Math.round(wb)} outstanding, the import calculates KES ${Math.round(res.outstanding)}`);
  }

  /* ---- fines: the balance each member still owes is carried forward as one fine ---- */
  const fines = [];
  for (const f of raw.fineBalances) {
    const id = String(f.memberId).trim().toUpperCase();
    if (!byId.has(id)) continue;
    const owed = round(num(f.outstanding));
    if (owed > 0) fines.push({ memberId: id, amount: owed, dateIssued: isDate(S.reportDate) ? S.reportDate : today, note: "Balance brought forward from the Excel workbook" });
  }

  /* ---- meetings ---- */
  const meetings = [];
  for (const mt of raw.meetings) {
    if (mt.marks.length === 0) continue;
    const attendance = [];
    for (const k of mt.marks) {
      const id = String(k.memberId).trim().toUpperCase();
      if (!byId.has(id)) { err(k.ref, `member ${id} is not in the member list`); continue; }
      const status = k.code === "A" ? "absent" : k.code === "AP" ? "apology" : k.code === "P" || k.code === "L" ? "present" : null;
      if (!status) { err(k.ref, `attendance "${k.code}" must be P, L, A or AP`); continue; }
      attendance.push({ memberId: id, status, fined: status === "absent" }); // already in the carried-forward fines
    }
    meetings.push({
      title: `Meeting ${mt.n}`, date: mt.date, attendance, agendaItems: [], actionItems: [],
      location: undefined, minutes: undefined,
    });
  }
  for (const m of raw.minutes) {
    if (!isDate(m.date)) { if (m.topic || m.action) err(m.ref, "the meeting date is missing"); continue; }
    let meeting = meetings.find((x) => ymd(x.date) === ymd(m.date));
    if (!meeting) {
      meeting = { title: `Meeting on ${ymd(m.date)}`, date: m.date, attendance: [], agendaItems: [], actionItems: [] };
      meetings.push(meeting);
    }
    if (m.topic) meeting.agendaItems.push({ title: String(m.topic), resolution: m.minutes ? String(m.minutes) : undefined, status: "closed" });
    if (m.action) meeting.actionItems.push({
      task: String(m.action), assignee: m.owner ? String(m.owner) : undefined, dueDate: isDate(m.due) ? m.due : undefined,
      status: /done|complete/i.test(m.status) ? "done" : /progress/i.test(m.status) ? "in_progress" : "open",
    });
  }
  meetings.sort((a, b) => a.date - b.date);

  /* ---- merry-go-round ---- */
  let cycle = null;
  const mg = raw.rounds.filter((r) => /merry/i.test(r.type));
  const skippedTB = raw.rounds.length - mg.length;
  if (skippedTB > 0) warn("Merry-Go-Round", `${skippedTB} "Table Banking" round(s) are not imported (PoolIt has merry-go-round only)`);
  if (mg.length) {
    const rounds = [];
    for (const r of mg) {
      const rid = String(r.recipientId || "").trim().toUpperCase();
      if (!byId.has(rid)) { err(r.ref, `recipient ${rid || "(blank)"} is not in the member list`); continue; }
      if (!isDate(r.date)) { err(r.ref, "the scheduled date is missing"); continue; }
      const paid = /receiv|paid/i.test(r.status);
      rounds.push({ position: num(r.round), memberId: rid, payout: round(num(r.expected) || num(r.received)), scheduledDate: r.date, status: paid ? "paid" : "pending", paidOn: paid ? (isDate(r.dateReceived) ? r.dateReceived : r.date) : undefined });
    }
    rounds.sort((a, b) => a.position - b.position);
    if (rounds.length && !(num(S.mgrAmount) > 0)) err("Settings", "the merry-go-round amount is missing");
    if (rounds.length) cycle = { name: `Imported cycle ${S.finYear || ""}`.trim(), amountPerMember: num(S.mgrAmount), rounds, status: rounds.every((r) => r.status === "paid") ? "completed" : "active" };
  }

  /* ---- expenses and investments ---- */
  const expenses = [];
  for (const e of raw.expenses) {
    if (!isDate(e.date)) { err(e.ref, "the expense date is missing"); continue; }
    if (!(num(e.amount) > 0)) { err(e.ref, "the amount must be more than zero"); continue; }
    expenses.push({
      date: e.date, category: String(e.category || "General"), amount: round(num(e.amount)),
      description: [e.description, e.approvedBy ? `(approved by ${e.approvedBy})` : ""].filter(Boolean).join(" "),
      reference: e.receipt ? String(e.receipt) : undefined,
    });
  }
  const investments = [];
  const invById = new Map();
  for (const i of raw.investments) {
    const id = String(i.id).trim().toUpperCase();
    if (!(num(i.invested) > 0)) { err(i.ref, `${id}: the amount invested is missing`); continue; }
    const type = (INVESTMENT_TYPE.find(([re]) => re.test(i.type)) || [])[1] || "other";
    const rec = { id, name: String(i.description || id), type, amountInvested: round(num(i.invested)), dateInvested: isDate(i.date) ? i.date : today, currentValue: round(num(i.currentValue) || num(i.invested)), returns: [] };
    investments.push(rec);
    invById.set(id, rec);
  }
  for (const r of raw.returns) {
    const inv = invById.get(String(r.invId).trim().toUpperCase());
    if (!inv) { err(r.ref, `investment ${r.invId} is not in the investments list`); continue; }
    if (!(num(r.amount) > 0)) { err(r.ref, "the amount must be more than zero"); continue; }
    inv.returns.push({ date: isDate(r.date) ? r.date : today, amount: round(num(r.amount)), note: r.note ? String(r.note) : undefined });
  }

  if (members.length === 0) err("Members", "no members were found");

  const sum = (list, f) => list.reduce((s, x) => s + f(x), 0);
  const summary = {
    members: members.length,
    openingSavings: sum(members, (m) => m.opening),
    contributions: contributions.filter((c) => !c.opening).length,
    contributionsTotal: round(sum(contributions.filter((c) => !c.opening), (c) => c.amount)),
    welfareIn: welfareIn.length, welfareOut: welfareOut.length,
    loans: loans.length, loansActive: loans.filter((l) => l.status === "active").length,
    repayments: repaymentRows.length, owedOnLoans: round(sum(loans, (l) => l.outstanding)),
    finesCarried: fines.length, finesTotal: round(sum(fines, (f) => f.amount)),
    meetings: meetings.length, rounds: cycle ? cycle.rounds.length : 0,
    expenses: expenses.length, investments: investments.length,
  };

  return {
    errors, warnings, summary, officials, openYear,
    members, contributions, welfareIn, welfareOut, loans, repayments: repaymentRows, fines, meetings, cycle, expenses, investments,
    workbookSettings: S,
  };
}

// A short plain-text report for the screen
export function formatReport(plan) {
  const k = (n) => Math.round(n).toLocaleString("en-KE");
  const s = plan.summary;
  const L = [];
  L.push("WHAT WOULD BE IMPORTED");
  L.push(`  Members .................... ${s.members}  (opening savings KES ${k(s.openingSavings)})`);
  L.push(`  Monthly contributions ...... ${s.contributions}  (KES ${k(s.contributionsTotal)})`);
  L.push(`  Welfare in / paid out ...... ${s.welfareIn} / ${s.welfareOut}`);
  L.push(`  Loans ...................... ${s.loans}  (${s.loansActive} still owing, KES ${k(s.owedOnLoans)} outstanding)`);
  L.push(`  Loan repayments ............ ${s.repayments}`);
  L.push(`  Fine balances carried ...... ${s.finesCarried}  (KES ${k(s.finesTotal)})`);
  L.push(`  Meetings ................... ${s.meetings}`);
  L.push(`  Merry-go-round turns ....... ${s.rounds}`);
  L.push(`  Expenses / investments ..... ${s.expenses} / ${s.investments}`);
  if (plan.warnings.length) { L.push("", `WARNINGS (${plan.warnings.length}): worth a look, not blocking`); plan.warnings.slice(0, 40).forEach((w) => L.push(`  - ${w.ref}: ${w.message}`)); if (plan.warnings.length > 40) L.push(`  ... and ${plan.warnings.length - 40} more`); }
  if (plan.errors.length) { L.push("", `PROBLEMS TO FIX IN THE WORKBOOK (${plan.errors.length})`); plan.errors.slice(0, 60).forEach((e) => L.push(`  - ${e.ref}: ${e.message}`)); if (plan.errors.length > 60) L.push(`  ... and ${plan.errors.length - 60} more`); }
  return L.join("\n");
}
