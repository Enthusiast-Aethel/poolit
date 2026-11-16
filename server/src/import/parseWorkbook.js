// Reads the "Chama Manager" Excel workbook into plain rows. No database, no judgement:
// planImport.js decides what the rows mean. Every row keeps its sheet and cell (e.g. "Loans!A6")
// so problems can be pointed out exactly.
import ExcelJS from "exceljs";

export class LayoutError extends Error {}

const clean = (v) => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return clean(v.result);      // a formula: use the value Excel saved
    if ("error" in v) return null;
    if (Array.isArray(v.richText)) return clean(v.richText.map((t) => t.text).join(""));
    if ("text" in v) return clean(v.text);
    return null;
  }
  if (typeof v === "string") { const t = v.trim(); return t === "" ? null : t; }
  return v;
};

// The columns this importer relies on, as laid out in the template. If any heading has moved
// (someone inserted a column), stop with a clear message instead of reading the wrong numbers.
const EXPECT = {
  Members: { row: 5, cols: { 1: "Member ID", 2: "Full Name", 3: "Phone", 4: "National ID", 5: "Join Date", 6: "Status", 7: "Next of Kin", 9: "Opening Savings" } },
  Contributions: { row: 5, cols: { 25: "Date Paid", 26: "Member ID", 28: "For Month", 29: "For Year", 30: "Amount", 31: "Method", 32: "Transaction Code" } },
  Loans: { row: 5, cols: { 1: "Loan ID", 2: "Member ID", 4: "Loan Amount", 5: "Interest Method", 7: "Rate Used", 8: "Term", 9: "Issue Date", 11: "Guarantor 1", 12: "Guarantor 2" } },
  "Loan Repayments": { row: 5, cols: { 1: "Date Paid", 2: "Loan ID", 4: "Amount Paid", 6: "Transaction Code" } },
  "Fines & Penalties": { row: 5, cols: { 1: "Member ID", 13: "Outstanding" } },
  "Welfare Fund": { row: 5, cols: { 1: "Date", 2: "Member ID", 4: "Type", 5: "Details", 6: "Amount" } },
  "Merry-Go-Round": { row: 5, cols: { 1: "Round #", 2: "Type", 3: "Scheduled Date", 4: "Recipient ID", 7: "Expected Amount", 8: "Amount Received", 9: "Date Received", 11: "Status" } },
  "Expenses & Investments": { row: 5, cols: { 1: "Date", 2: "Category", 4: "Amount", 9: "Inv. ID", 14: "Current Value", 19: "Return Date", 22: "Return Amount" } },
  "Meetings & Attendance": { row: 5, cols: { 1: "Member ID" } },
  Settings: { row: 6, cols: { 1: "Chama name" } },
};

export async function parseWorkbook(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);

  const problems = [];
  const sheet = (name) => {
    const ws = wb.getWorksheet(name);
    if (!ws) problems.push(`The sheet "${name}" is missing.`);
    return ws;
  };
  for (const [name, { row, cols }] of Object.entries(EXPECT)) {
    const ws = sheet(name);
    if (!ws) continue;
    for (const [c, text] of Object.entries(cols)) {
      const got = String(clean(ws.getCell(row, Number(c)).value) ?? "");
      if (!got.toLowerCase().startsWith(text.toLowerCase()))
        problems.push(`${name}!${ws.getCell(row, Number(c)).address} should say "${text}" but says "${got}".`);
    }
  }
  if (problems.length)
    throw new LayoutError(`This does not look like the unchanged Chama Manager workbook:\n  - ${problems.join("\n  - ")}`);

  const at = (ws, r, c) => clean(ws.getCell(r, c).value);
  const ref = (ws, r, c) => `${ws.name}!${ws.getCell(r, c).address}`;
  const scan = (ws, from, to, keyCol, build) => {
    const out = [];
    for (let r = from; r <= to; r++) if (at(ws, r, keyCol) !== null) out.push({ ref: `${ws.name} row ${r}`, ...build(r, (c) => at(ws, r, c), (c) => ref(ws, r, c)) });
    return out;
  };

  const S = wb.getWorksheet("Settings");
  const settings = {
    chamaName: at(S, 6, 2), finYear: at(S, 9, 2), monthlyContribution: at(S, 11, 2), dueDay: at(S, 12, 2),
    welfareMonthly: at(S, 14, 2), welfareLowAlert: at(S, 15, 2), mgrAmount: at(S, 16, 2),
    loanRatePerMonth: at(S, 18, 2), loanMultiplier: at(S, 19, 2), maxTerm: at(S, 20, 2),
    fineLate: at(S, 22, 2), fineAbsent: at(S, 23, 2), fineApology: at(S, 24, 2), fineLateArrival: at(S, 25, 2),
    reportDate: at(S, 29, 2), reservePct: at(S, 30, 2),
    officials: [35, 36, 37, 38, 39].map((r) => ({ role: at(S, r, 1), name: at(S, r, 2) })).filter((o) => o.role && o.name),
  };

  const M = wb.getWorksheet("Members");
  const members = scan(M, 6, 45, 1, (r, v, x) => ({
    id: v(1), name: v(2), phone: v(3), nationalId: v(4), joinDate: v(5), status: v(6), kin: v(7), kinPhone: v(8), opening: v(9),
    cells: { phone: x(3), joinDate: x(5), opening: x(9) },
  }));

  const C = wb.getWorksheet("Contributions");
  const contributions = scan(C, 6, 1005, 26, (r, v) => ({ date: v(25), memberId: v(26), month: v(28), year: v(29), amount: v(30), method: v(31), code: v(32) }));

  const L = wb.getWorksheet("Loans");
  const loans = scan(L, 6, 105, 1, (r, v) => ({
    id: v(1), memberId: v(2), amount: v(4), method: v(5), rateOverride: v(6), rateUsed: v(7), term: v(8),
    issueDate: v(9), guarantor1: v(11), guarantor2: v(12), workbookOutstanding: v(17), workbookStatus: v(19),
  }));

  const R = wb.getWorksheet("Loan Repayments");
  const repayments = scan(R, 6, 505, 2, (r, v) => ({ date: v(1), loanId: v(2), amount: v(4), method: v(5), code: v(6), memberId: v(12) }));

  const F = wb.getWorksheet("Fines & Penalties");
  const fineBalances = scan(F, 6, 45, 1, (r, v) => ({ memberId: v(1), outstanding: v(13), totalFines: v(11), paid: v(12) }));

  const W = wb.getWorksheet("Welfare Fund");
  const welfare = scan(W, 6, 605, 2, (r, v) => ({ date: v(1), memberId: v(2), type: v(4), details: v(5), amount: v(6) }));

  const G = wb.getWorksheet("Merry-Go-Round");
  const rounds = scan(G, 6, 45, 1, (r, v) => ({ round: v(1), type: v(2), date: v(3), recipientId: v(4), expected: v(7), received: v(8), dateReceived: v(9), status: v(11) }));

  const E = wb.getWorksheet("Expenses & Investments");
  const expenses = scan(E, 6, 205, 4, (r, v) => ({ date: v(1), category: v(2), description: v(3), amount: v(4), paidVia: v(5), receipt: v(6), approvedBy: v(7) }));
  const investments = scan(E, 6, 205, 9, (r, v) => ({ id: v(9), date: v(10), type: v(11), description: v(12), invested: v(13), currentValue: v(14) }));
  const returns = scan(E, 6, 205, 20, (r, v) => ({ date: v(19), invId: v(20), asset: v(21), amount: v(22), note: v(23) }));

  const A = wb.getWorksheet("Meetings & Attendance");
  const meetings = [];
  for (let c = 3; c <= 14; c++) {
    const date = at(A, 5, c);
    if (!(date instanceof Date)) continue;
    const marks = [];
    for (let r = 6; r <= 45; r++) {
      const id = at(A, r, 1), code = at(A, r, c);
      if (id && code) marks.push({ memberId: id, code: String(code).toUpperCase(), ref: ref(A, r, c) });
    }
    meetings.push({ ref: ref(A, 5, c), n: c - 2, date, marks });
  }
  const minutes = scan(A, 6, 105, 23, (r, v) => ({ date: v(23), topic: v(24), minutes: v(25), action: v(26), owner: v(27), due: v(28), status: v(29) }));

  return { settings, members, contributions, loans, repayments, fineBalances, welfare, rounds, expenses, investments, returns, meetings, minutes };
}
