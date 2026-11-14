// Monthly contribution standing for the current year.
// paidByMonth = { 1: 2000, 2: 2000, ... } (sum of monthly contributions recorded per month)
export function standing({ paidByMonth = {}, joinDate, dueDay = 5, monthlyAmount = 0, today = new Date() }) {
  const year = today.getFullYear();
  const thisMonth = today.getMonth() + 1;
  const joined = joinDate ? new Date(joinDate) : null;
  // Someone who joins after this month's due day owes nothing for that month
  const start = joined && joined.getFullYear() === year
    ? joined.getMonth() + 1 + (joined.getDate() > dueDay ? 1 : 0)
    : 1;

  let dueMonths = 0;
  let unpaidMonths = 0;
  let arrears = 0;

  for (let m = start; m <= thisMonth; m++) {
    const paid = paidByMonth[m] || 0;
    const dueDate = new Date(year, m - 1, dueDay, 23, 59, 59);
    const settled = monthlyAmount > 0 && paid >= monthlyAmount;
    if (!(today > dueDate || settled)) continue; // not due yet
    dueMonths++;
    if (!settled && monthlyAmount > 0) {
      unpaidMonths++;
      arrears += monthlyAmount - paid;
    }
  }

  const paidThisMonth = monthlyAmount > 0 && (paidByMonth[thisMonth] || 0) >= monthlyAmount;
  const nextDue = new Date(year, paidThisMonth ? thisMonth : thisMonth - 1, dueDay);
  const daysLeft = Math.ceil((nextDue - today) / 86400000);

  return { dueMonths, unpaidMonths, paidMonths: dueMonths - unpaidMonths, arrears, paidThisMonth, nextDue, daysLeft };
}
