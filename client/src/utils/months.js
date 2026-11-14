// State of each month of the year for one member's monthly contribution
// states: paid | partial | overdue | pending (due soon) | future | none (before they joined)
export function memberMonths({ contributions = [], monthlyAmount = 0, dueDay = 5, joinDate, year, today = new Date() }) {
  const amounts = Array(12).fill(0);
  for (const c of contributions) {
    if (c.type?.code === "monthly" && c.year === year && c.month) amounts[c.month - 1] += c.amount;
  }
  const joined = joinDate ? new Date(joinDate) : null;
  const firstMonth =
    joined && joined.getFullYear() === year ? joined.getMonth() + 1 + (joined.getDate() > dueDay ? 1 : 0)
    : joined && joined.getFullYear() > year ? 13 : 1;
  const thisYear = today.getFullYear();

  let paidCount = 0, dueCount = 0;
  const states = amounts.map((amount, i) => {
    const m = i + 1;
    if (m < firstMonth && amount === 0) return "none";
    const future = year > thisYear || (year === thisYear && m > today.getMonth() + 1);
    if (monthlyAmount > 0) {
      const duePassed = year < thisYear || (year === thisYear && today > new Date(year, m - 1, dueDay, 23, 59, 59));
      const settled = amount >= monthlyAmount;
      if (settled || duePassed) {
        dueCount++;
        if (settled) paidCount++;
      }
      if (settled) return "paid";
      if (amount > 0) return "partial";
      if (future) return "future";
      return duePassed ? "overdue" : "pending";
    }
    return amount > 0 ? "paid" : future ? "future" : "none";
  });
  return { amounts, states, paidCount, dueCount };
}
