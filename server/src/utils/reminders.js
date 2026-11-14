const DAY = 86400000;
const round = (n) => Math.round(n * 100) / 100;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// first reminder the day after the due date, then once a week
export const overdueToday = (daysLate) => daysLate === 1 || (daysLate > 1 && (daysLate - 1) % 7 === 0);

const fmt = (d) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
const kes = (n) => Math.round(n).toLocaleString("en-KE");

// Who should be reminded about this month's contribution today?
// members = [{ _id, joinDate }], paidByMember = { memberId: amountPaidThisMonth }
export function pickContributionReminders({ members, paidByMember, monthlyAmount, dueDay, daysBefore = 3, today = new Date() }) {
  if (!(monthlyAmount > 0)) return [];
  const t0 = startOfDay(today);
  const due = new Date(t0.getFullYear(), t0.getMonth(), dueDay);
  const days = Math.round((due - t0) / DAY); // positive = still to come
  const out = [];

  for (const m of members) {
    const joined = m.joinDate ? new Date(m.joinDate) : null;
    if (joined && joined.getFullYear() === t0.getFullYear() && joined.getMonth() === t0.getMonth() && joined.getDate() > dueDay) continue; // joined after the due day
    const paid = paidByMember[String(m._id)] || 0;
    if (paid >= monthlyAmount) continue;
    const owing = round(monthlyAmount - paid);

    if (days >= 0 && days <= daysBefore) out.push({ kind: "reminderContribution", member: m._id, vars: { amount: kes(owing), date: fmt(due) } });
    else if (days < 0 && overdueToday(-days)) out.push({ kind: "overdueContribution", member: m._id, vars: { amount: kes(owing), date: fmt(due) } });
  }
  return out;
}

// loans = active loans with a schedule: [{ _id, loanNo, member, schedule: [{ dueDate, total, paid }] }]
export function pickLoanReminders({ loans, daysBefore = 3, today = new Date() }) {
  const t0 = startOfDay(today);
  const out = [];
  for (const l of loans) {
    const next = (l.schedule || []).find((i) => round(i.total - i.paid) > 0);
    if (!next) continue;
    const due = startOfDay(new Date(next.dueDate));
    const days = Math.round((due - t0) / DAY);
    const vars = { loanNo: l.loanNo || "your loan", amount: kes(next.total - next.paid), date: fmt(due) };
    if (days >= 0 && days <= daysBefore) out.push({ kind: "reminderLoan", member: l.member, ref: String(l._id), vars });
    else if (days < 0 && overdueToday(-days)) out.push({ kind: "overdueLoan", member: l.member, ref: String(l._id), vars });
  }
  return out;
}
