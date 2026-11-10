import mongoose from "mongoose";

const fineRuleSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ["percentage", "flat"], default: "flat" },
    value: { type: Number, default: 0 },     // % of overdue amount, or KES flat
    graceDays: { type: Number, default: 3 }, // 3 to 7 days
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    chamaName: { type: String, default: "Kilele Chama" },

    loanMultiplier: { type: Number, default: 3 },
    interestRate: { type: Number, default: 11 },           // % per annum
    smallLoanThreshold: { type: Number, default: 20000 }, // chairperson picks within 5,000-20,000
    smallLoanMonths: { type: Number, default: 3 },
    maxLoanMonths: { type: Number, default: 12 },
    guarantorsRequired: { type: Number, default: 2 },

    fines: {
      lateContribution: { type: fineRuleSchema, default: () => ({ mode: "flat", value: 200 }) },
      missedMeeting: { type: fineRuleSchema, default: () => ({ mode: "flat", value: 200 }) },
      lateRepayment: { type: fineRuleSchema, default: () => ({ mode: "percentage", value: 5 }) },
    },
    contributionDueDay: { type: Number, default: 5 },    // day of month
  },
  { timestamps: true }
);

// Always work with the single settings doc
settingsSchema.statics.get = async function () {
  return (await this.findOne()) || (await this.create({}));
};

export default mongoose.model("Settings", settingsSchema);