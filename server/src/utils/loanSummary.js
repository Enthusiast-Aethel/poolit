const DAY = 86400000;
const round = (n) => Math.round(n * 100) / 100;
const owed = (i) => round(i.total - i.paid);

export function installmentState(i, today = new Date()) {
  if (owed(i) <= 0) return "paid";
  if (new Date(i.dueDate) < today) return "overdue";
  return i.paid > 0 ? "partial" : "upcoming";
}

// Derives overdue status, arrears, next due date and progress from the schedule
export function summarizeLoan(loan, today = new Date()) {
  const l = typeof loan.toObject === "function" ? loan.toObject() : loan;
  const schedule = (l.schedule || []).map((i) => ({ ...i, state: installmentState(i, today) }));
  const active = l.status === "active";
  const overdue = schedule.filter((i) => i.state === "overdue");
  const upcoming = schedule.find((i) => i.state === "upcoming" || i.state === "partial");
  const focus = overdue[0] || upcoming;
  const sameMonth = (d) => {
    const x = new Date(d);
    return x.getFullYear() === today.getFullYear() && x.getMonth() === today.getMonth();
  };

  return {
    schedule,
    summary: {
      balance: round((l.totalPayable || 0) - (l.totalPaid || 0)),
      arrears: active ? round(overdue.reduce((s, i) => s + owed(i), 0)) : 0,
      daysPastDue: active && overdue[0] ? Math.floor((today - new Date(overdue[0].dueDate)) / DAY) : 0,
      displayStatus: active && overdue.length ? "overdue" : l.status,
      nextDue: active && focus ? { no: focus.no, dueDate: focus.dueDate, amount: owed(focus) } : null,
      paidInstallments: schedule.filter((i) => i.state === "paid").length,
      totalInstallments: schedule.length,
      progress: l.totalPayable ? Math.round((l.totalPaid / l.totalPayable) * 1000) / 10 : 0,
      maturity: schedule.length ? schedule[schedule.length - 1].dueDate : null,
      dueThisMonth: active
        ? round(schedule.filter((i) => sameMonth(i.dueDate)).reduce((s, i) => s + Math.max(0, owed(i)), 0))
        : 0,
    },
  };
}
