import express from "express";

import {
	forgotPassword,
	isLoggedIn,
	login,
	logout,
	resendVerification,
	resetPassword,
	signup,
	verifyEmail,
} from "../controllers/authController.js";

const router = express.Router();

router.get("/logout", isLoggedIn, logout);

router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/forgot-password", forgotPassword);
router.patch("/reset-password", resetPassword);

export default router;
