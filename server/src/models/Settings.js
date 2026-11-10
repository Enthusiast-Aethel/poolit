import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    chamaName: { type: String, default: "Kilele Chama" },
    monthlyContribution: { type: Number, default: 0 },
    registrationFee: { type: Number, default: 0 },
    welfareAmount: { type: Number, default: 0 },
    merryGoRoundAmount: { type: Number, default: 0 },

    loanMultiplier: { type: Number, default: 3 },        // 3x savings
    interestRate: { type: Number, default: 11 },         // % per annum
    smallLoanThreshold: { type: Number, default: 0 },    // loans <= this repay in smallLoanMonths
    smallLoanMonths: { type: Number, default: 3 },
    maxLoanMonths: { type: Number, default: 12 },
    minGuarantors: { type: Number, default: 1 },

    fines: {
      lateContribution: { type: Number, default: 0 },
      missedMeeting: { type: Number, default: 0 },
      lateRepayment: { type: Number, default: 0 },
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