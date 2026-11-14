import Loan from "../models/Loan.js";
import Settings from "../models/Settings.js";
import { getSavings } from "./savings.js";
import { loanRequirements } from "./rules.js";

// What the member still owes: active loans count the remaining balance,
// pending/approved loans count the amount already requested.
export async function getOutstanding(memberId) {
  const loans = await Loan.find({ member: memberId, status: { $in: ["pending", "approved", "active"] } });
  return loans.reduce((s, l) => s + (l.status === "active" ? l.totalPayable - l.totalPaid : l.principal), 0);
}

export async function getEligibility(memberId, amount) {
  const [settings, savings, outstanding] = await Promise.all([
    Settings.get(),
    getSavings(memberId),
    getOutstanding(memberId),
  ]);
  const limit = savings * settings.loanMultiplier;
  const available = Math.max(0, limit - outstanding);
  const reqs = loanRequirements({ amount: Number(amount) || 0, savings, outstanding, settings });
  return { savings, outstanding, limit, available, ...reqs };
}
