import mongoose from "mongoose";

const fineRuleSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ["percentage", "flat"], default: "flat" },
    value: { type: Number, default: 0, min: 0 }, // % of the overdue amount, or KES flat
    graceDays: { type: Number, default: 3, min: 0 },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    cap: { type: Number, default: 0, min: 0 }, // 0 = no limit
  },
  { _id: false }
);

const changeSchema = new mongoose.Schema({ field: String, from: String, to: String }, { _id: false });
const logSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    byName: String,
    changes: [changeSchema],
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    // identity
    chamaName: { type: String, default: "Kilele Chama", trim: true },
    registrationNumber: { type: String, trim: true },
    kraPin: { type: String, trim: true },
    fiscalYearStartMonth: { type: Number, min: 1, max: 12, default: 1 },
    address: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    bankDetails: { type: String, trim: true },
    paybill: { type: String, trim: true },

    // contributions
    contributionDueDay: { type: Number, min: 1, max: 28, default: 5 },

    // loans
    loanMultiplier: { type: Number, default: 3, min: 0 },
    interestRate: { type: Number, default: 11, min: 0 },
    smallLoanThreshold: { type: Number, default: 20000, min: 0 },
    smallLoanMonths: { type: Number, default: 3, min: 1 },
    maxLoanMonths: { type: Number, default: 12, min: 1 },
    guarantorsRequired: { type: Number, default: 2, min: 0 },

    fines: {
      lateContribution: { type: fineRuleSchema, default: () => ({ mode: "flat", value: 200, graceDays: 3 }) },
      missedMeeting: { type: fineRuleSchema, default: () => ({ mode: "flat", value: 200, graceDays: 0 }) },
      lateRepayment: { type: fineRuleSchema, default: () => ({ mode: "percentage", value: 5, graceDays: 3 }) },
    },

    welfare: {
      reserveFloor: { type: Number, default: 0, min: 0 }, // 0 = no minimum reserve alert
      categories: {
        type: [categorySchema],
        default: () => [
          { key: "bereavement", label: "Bereavement", cap: 0 },
          { key: "medical", label: "Medical / hospitalization", cap: 0 },
          { key: "maternity", label: "Maternity", cap: 0 },
          { key: "calamity", label: "Calamity / distress", cap: 0 },
          { key: "other", label: "Other", cap: 0 },
        ],
      },
    },

    quorumPercent: { type: Number, min: 0, max: 100, default: 0 }, // 0 = no quorum rule

    // text messages
    sms: {
      enabled: { type: Boolean, default: false }, // master switch for automatic messages
      reminderDaysBefore: { type: Number, default: 3, min: 0, max: 14 },
      events: {
        contributionReceived: { type: Boolean, default: true },
        repaymentReceived: { type: Boolean, default: true },
        loanUpdates: { type: Boolean, default: true },
        guaranteeRequest: { type: Boolean, default: true },
        fineIssued: { type: Boolean, default: true },
        welfareUpdates: { type: Boolean, default: true },
        reminders: { type: Boolean, default: true },
      },
      templates: { type: mongoose.Schema.Types.Mixed, default: {} }, // wording overrides, by message key
    },
    changeLog: { type: [logSchema], select: false },
  },
  { timestamps: true }
);

// Always work with the single settings doc
settingsSchema.statics.get = async function () {
  return (await this.findOne()) || (await this.create({}));
};

export default mongoose.model("Settings", settingsSchema);
