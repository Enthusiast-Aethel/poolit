import ContributionType from "../models/ContributionType.js";
import Contribution from "../models/Contribution.js";
import Loan from "../models/Loan.js";
import Fine from "../models/Fine.js";

const blank = () => ({ savings: 0, paidByMonth: {}, welfare: 0, activeBalance: 0, committed: 0, unpaidFines: 0 });

// Per-member totals used by the members register and member profile
export async function loadStats() {
  const year = new Date().getFullYear();
  const [types, loans, fines] = await Promise.all([
    ContributionType.find(),
    Loan.find({ status: { $in: ["pending", "approved", "active"] } }).lean(),
    Fine.find({ status: "unpaid" }).lean(),
  ]);
  const monthly = types.find((t) => t.code === "monthly");
  const welfare = types.find((t) => t.code === "welfare");
  const typeIds = [monthly?._id, welfare?._id].filter(Boolean);
  const contribs = typeIds.length
    ? await Contribution.find({ type: { $in: typeIds } }).select("member type amount year month").lean()
    : [];

  const stats = new Map();
  const of = (id) => {
    const k = String(id);
    if (!stats.has(k)) stats.set(k, blank());
    return stats.get(k);
  };

  for (const c of contribs) {
    const s = of(c.member);
    if (monthly && String(c.type) === String(monthly._id)) {
      s.savings += c.amount;
      if (c.year === year && c.month) s.paidByMonth[c.month] = (s.paidByMonth[c.month] || 0) + c.amount;
    } else {
      s.welfare += c.amount;
    }
  }
  for (const l of loans) {
    const s = of(l.member);
    if (l.status === "active") s.activeBalance += l.totalPayable - l.totalPaid;
    else s.committed += l.principal; // requested or approved but not yet disbursed
  }
  for (const f of fines) of(f.member).unpaidFines += f.amount;

  return { get: (id) => stats.get(String(id)) || blank(), monthlyAmount: monthly?.amount || 0 };
}
