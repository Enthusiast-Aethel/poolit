const round = (n) => Math.round(n * 100) / 100;

// gross surplus -> optional reserve % -> other deductions -> distributable pool
export function computeDistributable({ grossSurplus, reservePercent = 0, otherDeductions = 0 }) {
  const reserveAmount = round(grossSurplus * (reservePercent / 100));
  return { reserveAmount, distributable: round(grossSurplus - reserveAmount - otherDeductions) };
}

// Dividend = distributable x (member savings / total savings), rounded DOWN to the cent.
// rows = [{ _id: memberId, total: savings }]
export function allocate(rows, distributable) {
  const totalSavings = rows.reduce((s, r) => s + r.total, 0);
  if (!totalSavings) return { totalSavings: 0, allocations: [], unallocated: distributable };
  const allocations = rows
    .map((r) => ({
      member: r._id,
      savings: r.total,
      share: r.total / totalSavings,
      amount: Math.floor(((distributable * r.total) / totalSavings) * 100) / 100,
    }))
    .sort((a, b) => b.savings - a.savings);
  const allocated = round(allocations.reduce((s, a) => s + a.amount, 0));
  return { totalSavings, allocations, unallocated: round(distributable - allocated) };
}
