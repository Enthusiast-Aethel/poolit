const round = (n) => Math.round(n * 100) / 100;

export function buildSchedule({ principal, annualRate, months, method, startDate }) {
  const schedule = [];
  const dueDate = (i) => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    return d;
  };

  if (method === "flat") {
    const totalInterest = principal * (annualRate / 100) * (months / 12);
    let balance = principal;
    for (let i = 1; i <= months; i++) {
      const interest = round(totalInterest / months);
      const princ = i === months ? round(balance) : round(principal / months);
      balance = round(balance - princ);
      schedule.push({ no: i, dueDate: dueDate(i), principal: princ, interest, total: round(princ + interest) });
    }
  } else {
    // reducing balance, equal monthly instalments
    const r = annualRate / 100 / 12;
    const emi = r === 0
      ? principal / months
      : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    let balance = principal;
    for (let i = 1; i <= months; i++) {
      const interest = round(balance * r);
      const princ = i === months ? round(balance) : round(emi - interest);
      balance = round(balance - princ);
      schedule.push({ no: i, dueDate: dueDate(i), principal: princ, interest, total: round(princ + interest) });
    }
  }
  return schedule;
}