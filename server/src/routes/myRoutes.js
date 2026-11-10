import { Router } from "express";
import * as my from "../controllers/myController.js";

const router = Router();

router.get("/savings", my.mySavings);
router.get("/loans", my.myLoans);
router.get("/guarantees", my.myGuarantees);
router.get("/fines", my.myFines);
router.get("/loan-eligibility", my.myLoanEligibility);
router.get("/statement", my.myStatement);

export default router;