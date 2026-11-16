import { Router } from "express";
import { login, me, createUser, changePassword } from "../controllers/authController.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = Router();

router.post("/login", login);
router.get("/me", protect, me);
router.patch("/password", protect, changePassword);
router.post("/users", protect, adminOnly, createUser);

export default router;
