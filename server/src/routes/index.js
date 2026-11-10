import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import * as settings from "../controllers/settingsController.js";
import * as members from "../controllers/memberController.js";
import * as contributions from "../controllers/contributionController.js";
import * as loans from "../controllers/loanController.js";
import * as fines from "../controllers/fineController.js";
import * as merry from "../controllers/merryController.js";
import * as welfare from "../controllers/welfareController.js";
import * as meetings from "../controllers/meetingController.js";
import * as finance from "../controllers/financeController.js";
import * as dividends from "../controllers/dividendController.js";
import { dashboard } from "../controllers/dashboardController.js";
import myRoutes from "./myRoutes.js";

const router = Router();
router.use(protect); // everything below needs login

// Dashboard
router.get("/dashboard", adminOnly, dashboard);

// Settings and contribution types
router.get("/settings", settings.getSettings);
router.put("/settings", adminOnly, settings.updateSettings);
router.get("/contribution-types", settings.listTypes);
router.post("/contribution-types", adminOnly, settings.createType);
router.put("/contribution-types/:id", adminOnly, settings.updateType);

// Members
router.get("/members/guarantor-options", members.listGuarantorOptions);
router.get("/members", adminOnly, members.listMembers);
router.get("/members/:id", adminOnly, members.getMember);
router.put("/members/:id", adminOnly, members.updateMember);

// Contributions
router.get("/contributions/matrix", adminOnly, contributions.matrix);
router.get("/contributions", adminOnly, contributions.listContributions);
router.post("/contributions", adminOnly, contributions.recordContribution);

// Loans
router.post("/loans", loans.applyLoan);
router.get("/loans", adminOnly, loans.listLoans);
router.get("/loans/:id", loans.getLoan);
router.patch("/loans/:id/guarantee", loans.respondGuarantee);
router.patch("/loans/:id/approve", adminOnly, loans.approveLoan);
router.patch("/loans/:id/reject", adminOnly, loans.rejectLoan);
router.patch("/loans/:id/disburse", adminOnly, loans.disburseLoan);
router.post("/loans/:id/repayments", adminOnly, loans.recordRepayment);

// Fines
router.get("/fines", adminOnly, fines.listFines);
router.post("/fines", adminOnly, fines.issueFine);
router.patch("/fines/:id", adminOnly, fines.updateFine);

// Merry-go-round (everyone can view, only admin changes)
router.get("/merry-go-round", merry.listCycles);
router.get("/merry-go-round/:id", merry.getCycle);
router.post("/merry-go-round", adminOnly, merry.createCycle);
router.patch("/merry-go-round/:id/rounds/:position/pay", adminOnly, merry.payRound);

// Welfare
router.get("/welfare", adminOnly, welfare.welfareSummary);
router.post("/welfare/payouts", adminOnly, welfare.createPayout);

// Meetings and attendance
router.get("/meetings", adminOnly, meetings.listMeetings);
router.post("/meetings", adminOnly, meetings.createMeeting);
router.get("/meetings/:id", adminOnly, meetings.getMeeting);
router.put("/meetings/:id", adminOnly, meetings.updateMeeting);
router.put("/meetings/:id/attendance", adminOnly, meetings.markAttendance);
router.post("/meetings/:id/fines", adminOnly, meetings.fineAbsentees);

// Expenses and investments
router.get("/expenses", adminOnly, finance.listExpenses);
router.post("/expenses", adminOnly, finance.createExpense);
router.delete("/expenses/:id", adminOnly, finance.deleteExpense);
router.get("/investments", adminOnly, finance.listInvestments);
router.post("/investments", adminOnly, finance.createInvestment);
router.put("/investments/:id", adminOnly, finance.updateInvestment);
router.post("/investments/:id/returns", adminOnly, finance.addReturn);

// Dividends
router.get("/dividends/surplus-preview", adminOnly, dividends.surplusPreview);
router.get("/dividends", adminOnly, dividends.listRuns);
router.post("/dividends", adminOnly, dividends.createRun);
router.get("/dividends/:id", adminOnly, dividends.getRun);
router.patch("/dividends/:id/finalize", adminOnly, dividends.finalizeRun);
router.delete("/dividends/:id", adminOnly, dividends.deleteDraft);
router.patch("/dividends/:id/pay/:memberId", adminOnly, dividends.markPaid);

// Member portal ("my" data sub-routes)
router.use("/my", myRoutes);

export default router;