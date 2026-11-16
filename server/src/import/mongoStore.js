// The real store for commitPlan, backed by the app's Mongoose models.
import User from "../models/User.js";
import ContributionType from "../models/ContributionType.js";
import Settings from "../models/Settings.js";
import Contribution from "../models/Contribution.js";
import WelfarePayout from "../models/WelfarePayout.js";
import Loan from "../models/Loan.js";
import Repayment from "../models/Repayment.js";
import Fine from "../models/Fine.js";
import Meeting from "../models/Meeting.js";
import MerryGoRound from "../models/MerryGoRound.js";
import Expense from "../models/Expense.js";
import Investment from "../models/Investment.js";

const MODEL = { Contribution, WelfarePayout, Loan, Repayment, Fine, Meeting, MerryGoRound, Expense, Investment };

export const mongoStore = {
  async counts() {
    const entries = await Promise.all(Object.entries(MODEL).map(async ([k, m]) => [k, await m.countDocuments()]));
    return Object.fromEntries(entries);
  },
  async findUsers({ phones, memberNos }) {
    return User.find({ $or: [{ phone: { $in: phones } }, { memberNo: { $in: memberNos } }] }).select("+nationalId").lean();
  },
  async chairperson() { return User.findOne({ role: "chairperson" }).select("_id name phone").lean(); },
  async insertUsers(docs) { return docs.length ? User.insertMany(docs) : []; }, // passwords are already hashed
  async updateUser(id, patch) { await User.updateOne({ _id: id }, { $set: patch }); },
  async deleteUsers(ids) { await User.deleteMany({ _id: { $in: ids } }); },
  async contributionTypes() {
    const t = await ContributionType.find({ code: { $in: ["monthly", "welfare"] } }).lean();
    return Object.fromEntries(t.map((x) => [x.code, x._id]));
  },
  async insert(model, docs) { return MODEL[model].insertMany(docs); },
  async deleteMany(model, ids) { await MODEL[model].deleteMany({ _id: { $in: ids } }); },
  async settings() {
    const s = await Settings.get();
    const [monthly, mgr] = await Promise.all([ContributionType.findOne({ code: "monthly" }), ContributionType.findOne({ code: "merry_go_round" })]);
    return {
      monthlyAmount: monthly?.amount, mgrAmount: mgr?.amount, dueDay: s.contributionDueDay, interestRate: s.interestRate,
      loanMultiplier: s.loanMultiplier, maxLoanMonths: s.maxLoanMonths,
      fineLate: s.fines?.lateContribution?.value, fineAbsent: s.fines?.missedMeeting?.value,
    };
  },
};
