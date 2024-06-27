import express from "express";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage });

import {
	changeUserPassword,
	deleteUser,
	getCurrentUser,
	updateUserPhoto,
	updateUserProfile,
} from "../controllers/userController.js";

import { canDelete, isLoggedIn } from "../controllers/authController.js";

const router = express.Router();

router.get("/session", isLoggedIn, getCurrentUser);

router.post("/profile-photo", isLoggedIn, upload.single("photo"), updateUserPhoto);

router.patch("/update-profile", isLoggedIn, updateUserProfile);
router.patch("/change-password", isLoggedIn, changeUserPassword);

router.delete("/delete-account", canDelete, deleteUser);

export default router;
