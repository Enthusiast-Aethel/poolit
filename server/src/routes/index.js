import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import * as settings from "../controllers/settingsController.js";
import * as members from "../controllers/memberController.js";
import * as contributions from "../controllers/contributionController.js";
import * as loans from "../controllers/loanController.js";
import * as fines from "../controllers/fineController.js";
import myRoutes from "./myRoutes.js";

const router = Router();
router.use(protect); // everything below needs login

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

// Member portal ("my" data sub-routes)
router.use("/my", myRoutes);

export default router;