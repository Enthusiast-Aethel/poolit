// Writes a checked plan into the database. It talks to a "store" so it can be tested without MongoDB
// (see mongoStore.js for the real one). If anything fails half-way, everything created by this run is
// removed again, so a failed import never leaves a half-filled chama behind.
import crypto from "crypto";
import bcrypt from "bcryptjs";

const MODELS = ["Contribution", "WelfarePayout", "Loan", "Repayment", "Fine", "Meeting", "MerryGoRound", "Expense", "Investment"];
const tempPassword = () => crypto.randomBytes(6).toString("base64url");

export async function checkDatabase(plan, store, { allowExistingData = false } = {}) {
  const problems = [];
  const counts = await store.counts();
  const busy = MODELS.filter((m) => counts[m] > 0);
  if (busy.length && !allowExistingData)
    problems.push(`The database already holds records (${busy.map((m) => `${m}: ${counts[m]}`).join(", ")}). Importing is meant for a new, empty chama. Nothing was changed.`);

  const existing = await store.findUsers({ phones: plan.members.map((m) => m.phone), memberNos: plan.members.map((m) => m.id) });
  const byPhone = new Map(existing.map((u) => [u.phone, u]));
  for (const m of plan.members) {
    const clash = existing.find((u) => u.memberNo === m.id && u.phone !== m.phone);
    if (clash) problems.push(`Member number ${m.id} (${m.name}) is already used by ${clash.name} (${clash.phone}).`);
  }
  return { problems, byPhone, counts };
}

export async function commitPlan(plan, store, { actorId, allowExistingData = false } = {}) {
  const check = await checkDatabase(plan, store, { allowExistingData });
  if (check.problems.length) throw new Error(check.problems.join("\n"));

  const created = Object.fromEntries(MODELS.map((m) => [m, []]));
  const createdUsers = [];
  const userId = new Map(); // workbook member ID -> database id
  const credentials = [];

  const insert = async (model, docs) => {
    if (!docs.length) return [];
    const out = await store.insert(model, docs);
    created[model].push(...out.map((d) => d._id));
    return out;
  };

  try {
    // ---- members: new accounts get a temporary password; people who already have an account are linked
    const fresh = [];
    for (const m of plan.members) {
      const have = check.byPhone.get(m.phone);
      if (have) {
        userId.set(m.id, have._id);
        const patch = {};
        if (!have.memberNo) patch.memberNo = m.id;
        if (!have.nationalId && m.nationalId) patch.nationalId = m.nationalId;
        if (!have.nextOfKin?.name && m.nextOfKin) patch.nextOfKin = m.nextOfKin;
        if (Object.keys(patch).length) await store.updateUser(have._id, patch);
        continue;
      }
      const pwd = tempPassword();
      fresh.push({ plan: m, pwd, doc: {
        name: m.name, phone: m.phone, memberNo: m.id, nationalId: m.nationalId, nextOfKin: m.nextOfKin,
        role: m.role, isActive: m.isActive, joinDate: m.joinDate,
        password: await bcrypt.hash(pwd, 10), mustChangePassword: true,
      } });
    }
    const users = await store.insertUsers(fresh.map((f) => f.doc));
    users.forEach((u, i) => {
      createdUsers.push(u._id);
      userId.set(fresh[i].plan.id, u._id);
      credentials.push({ memberNo: fresh[i].plan.id, name: fresh[i].plan.name, phone: fresh[i].plan.phone, password: fresh[i].pwd });
    });

    const types = await store.contributionTypes(); // { monthly, welfare } -> id
    if (!types.monthly || !types.welfare) throw new Error("The contribution types are missing. Run: node src/seed.js");

    // ---- savings and welfare
    await insert("Contribution", [
      ...plan.contributions.map((c) => ({
        member: userId.get(c.memberId), type: types.monthly, amount: c.amount, year: c.year, month: c.month,
        paidOn: c.paidOn, reference: c.reference, opening: !!c.opening, recordedBy: actorId,
      })),
      ...plan.welfareIn.map((w) => ({ member: userId.get(w.memberId), type: types.welfare, amount: w.amount, year: w.year, paidOn: w.paidOn, recordedBy: actorId })),
    ]);

    const claimNo = {};
    await insert("WelfarePayout", plan.welfareOut.map((w) => {
      const y = w.date.getFullYear();
      claimNo[y] = (claimNo[y] || 0) + 1;
      return { claimNo: `CLM-${y}-${String(claimNo[y]).padStart(3, "0")}`, member: userId.get(w.memberId), category: w.category, amount: w.amount, status: "paid", date: w.date, paidOn: w.date, note: w.note, approvedBy: actorId };
    }));

    // ---- loans, then their repayments
    const loanDocs = await insert("Loan", plan.loans.map((l) => ({
      loanNo: l.loanNo, member: userId.get(l.memberId), principal: l.principal, interestRate: l.interestRate,
      interestMethod: l.interestMethod, termMonths: l.termMonths,
      guarantors: l.guarantors.map((g) => ({ member: userId.get(g), status: "accepted" })),
      status: l.status, approvedBy: actorId, approvedAt: l.issueDate, disbursedOn: l.issueDate,
      schedule: l.schedule, totalPayable: l.totalPayable, totalPaid: l.totalPaid,
    })));
    const loanId = new Map(plan.loans.map((l, i) => [l.loanNo, loanDocs[i]._id]));
    await insert("Repayment", plan.repayments.map((r) => ({
      loan: loanId.get(r.loanNo), member: userId.get(r.memberId), amount: r.amount, paidOn: r.paidOn, reference: r.reference, recordedBy: actorId,
    })));

    // ---- fines
    const fineNo = {};
    await insert("Fine", plan.fines.map((f) => {
      const y = new Date(f.dateIssued).getFullYear();
      fineNo[y] = (fineNo[y] || 0) + 1;
      return { fineNo: `FN-${y}-${String(fineNo[y]).padStart(3, "0")}`, member: userId.get(f.memberId), reason: "other", amount: f.amount, dateIssued: f.dateIssued, status: "unpaid", note: f.note, issuedBy: actorId };
    }));

    // ---- meetings
    await insert("Meeting", plan.meetings.map((m) => ({
      title: m.title, date: m.date,
      attendance: m.attendance.map((a) => ({ member: userId.get(a.memberId), status: a.status, fined: a.fined })),
      agendaItems: m.agendaItems, actionItems: m.actionItems,
    })));

    // ---- merry-go-round
    if (plan.cycle) {
      await insert("MerryGoRound", [{
        name: plan.cycle.name, amountPerMember: plan.cycle.amountPerMember, status: plan.cycle.status, drawnBy: actorId,
        rounds: plan.cycle.rounds.map((r) => ({ position: r.position, member: userId.get(r.memberId), payout: r.payout, scheduledDate: r.scheduledDate, status: r.status, paidOn: r.paidOn })),
      }]);
    }

    // ---- expenses and investments
    const vouch = {};
    await insert("Expense", plan.expenses.map((e) => {
      const y = e.date.getFullYear();
      vouch[y] = (vouch[y] || 0) + 1;
      return { voucherNo: `EXP-${y}-${String(vouch[y]).padStart(3, "0")}`, category: e.category, description: e.description, amount: e.amount, date: e.date, reference: e.reference, recordedBy: actorId };
    }));
    await insert("Investment", plan.investments.map((i) => ({
      name: i.name, type: i.type, amountInvested: i.amountInvested, dateInvested: i.dateInvested, currentValue: i.currentValue, returns: i.returns,
    })));

    return { credentials, created: Object.fromEntries(Object.entries(created).map(([k, v]) => [k, v.length])), users: createdUsers.length, linked: plan.members.length - createdUsers.length };
  } catch (e) {
    // undo everything this run created
    for (const m of [...MODELS].reverse()) if (created[m].length) await store.deleteMany(m, created[m]).catch(() => {});
    if (createdUsers.length) await store.deleteUsers(createdUsers).catch(() => {});
    e.message = `${e.message}\n(Everything this import created was removed again, so you can fix the problem and retry.)`;
    throw e;
  }
}

// Plain English differences between the workbook's settings and what PoolIt is set to
export function compareSettings(workbook, system) {
  const rows = [];
  const add = (label, wb, sys) => { if (wb !== undefined && sys !== undefined && String(wb) !== String(sys)) rows.push({ label, workbook: wb, system: sys }); };
  add("Monthly contribution (KES)", workbook.monthlyContribution, system.monthlyAmount);
  add("Contribution due day", workbook.dueDay, system.dueDay);
  add("Loan interest (% a year)", Math.round(Number(workbook.loanRatePerMonth) * 1200 * 100) / 100, system.interestRate);
  add("Borrowing multiplier", workbook.loanMultiplier, system.loanMultiplier);
  add("Longest loan (months)", workbook.maxTerm, system.maxLoanMonths);
  add("Merry-go-round amount (KES)", workbook.mgrAmount, system.mgrAmount);
  add("Late contribution fine (KES)", workbook.fineLate, system.fineLate);
  add("Missed meeting fine (KES)", workbook.fineAbsent, system.fineAbsent);
  return rows;
}
