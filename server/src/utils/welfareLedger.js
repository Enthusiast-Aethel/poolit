const sum = (list, f = (x) => x.amount) => list.reduce((s, x) => s + f(x), 0);

// Month-by-month welfare fund ledger for a year.
// levies   = [{ amount, paidOn }]            welfare contributions received
// payouts  = [{ amount, paidOn?, date }]     claims already paid out
export function buildLedger({ levies, payouts, year, today = new Date() }) {
  const last = year === today.getFullYear() ? today.getMonth() : year < today.getFullYear() ? 11 : -1;
  const when = (p) => new Date(p.paidOn || p.date);
  const rows = [];
  for (let m = 0; m <= last; m++) {
    const from = new Date(year, m, 1);
    const to = new Date(year, m + 1, 1);
    const opening = sum(levies.filter((l) => new Date(l.paidOn) < from)) - sum(payouts.filter((p) => when(p) < from));
    const collected = sum(levies.filter((l) => new Date(l.paidOn) >= from && new Date(l.paidOn) < to));
    const disbursed = sum(payouts.filter((p) => when(p) >= from && when(p) < to));
    rows.push({ month: m + 1, opening, collected, disbursed, net: collected - disbursed, closing: opening + collected - disbursed });
  }
  return rows;
}
