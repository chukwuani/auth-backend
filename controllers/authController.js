import jwt from "jsonwebtoken";
import crypto from "crypto";
import { promisify } from "util";

import { User } from "../models/userModel.js";

import { AppError } from "../utils/appError.js";
import { catchAsync } from "../utils/catchAsync.js";
import { sendOTPEmail, sendPasswordResetEmail } from "../utils/email.js";

const signToken = (id, type) => {
	return jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn:
			type === "access" ? process.env.ACCESS_JWT_EXPIRES_IN : process.env.REFRESH_JWT_EXPIRES_IN,
	});
};

const generateOTP = () => {
	let digits = "0123456789";
	let OTP = "";
	let len = digits.length;

	for (let i = 0; i < 6; i++) {
		OTP += digits[Math.floor(Math.random() * len)];
	}

	return OTP;
};

export const signup = catchAsync(async (req, res, next) => {
	const { firstname, lastname, email, password } = req.body;
	const otp_code = generateOTP();
	const ip = req.ip;

	const oldUser = await User.findOne({ email });

	if (!oldUser) {
		const user = await User.create({
			firstname,
			lastname,
			email,
			password,
			otp_code,
		});

		const { data, error } = await sendOTPEmail({ email, otp_code, ip });

		if (error) {
			await User.deleteOne({ email: user.email });

			return next(error);
		}

		return res.status(201).json({
			status: "success",
			data,
		});
	}

	if (oldUser.isEmailVerified) {
		return next(new AppError("login", 400));
	}

	if (!oldUser.isEmailVerified) {
		oldUser.otp_code = otp_code;
		await oldUser.save();

		const { data, error } = await sendOTPEmail({ email, otp_code, ip });

		if (error) {
			return next(error);
		}

		return next(new AppError("verify_email", 400));
	}
});

export const login = catchAsync(async (req, res, next) => {
	const { email, password } = req.body;
	const ip = req.ip;

	if (!email || !password) {
		return next(new AppError("Please provide your email and password!", 400));
	}

	const user = await User.findOne({ email }).select("+password");

	if (!user) {
		return next(new AppError("Couldn't find your account.", 404));
	}

	if (!(await user.correctPassword(password, user.password))) {
		return next(new AppError("Password is incorrect. Please try again.", 400));
	}

	if (!user.isEmailVerified) {
		const otp_code = generateOTP();
		user.otp_code = otp_code;
		await user.save();

		const { data, error } = await sendOTPEmail({ email, otp_code, ip });

		return next(new AppError("verify_email", 400));
	}

	const accessToken = signToken(user._id, "access");
	const refreshToken = signToken(user._id, "refresh");

	res.cookie("authAccessToken", accessToken, {
		maxAge: 15 * 60 * 1000,
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		path: "/",
		sameSite: "none",
	});

	res.cookie("authRefreshToken", refreshToken, {
		maxAge: process.env.REFRESH_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		path: "/",
		sameSite: "none",
	});

	user.refreshToken = refreshToken;
	await user.save();

	res.status(200).json({
		status: "success",
		user,
	});
});

export const verifyEmail = catchAsync(async (req, res, next) => {
	const { email, otp_code } = req.body;

	const hashedOTP = crypto.createHash("sha256").update(otp_code).digest("hex");

	if (!email || !otp_code) {
		return next(new AppError("Please provide your email and otp_code!", 400));
	}

	const user = await User.findOne({ email }).select("+otp_code");

	if (!user) {
		return next(new AppError("Couldn't find your account.", 404));
	}

	if (user.isEmailVerified) {
		return next(new AppError("login", 400));
	}

	if (user.otp_code !== hashedOTP) {
		return next(new AppError("Your one-time password is incorrect. Please try again.", 400));
	}

	const accessToken = signToken(user._id, "access");
	const refreshToken = signToken(user._id, "refresh");

	res.cookie("authAccessToken", accessToken, {
		maxAge: 15 * 60 * 1000,
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		path: "/",
		sameSite: "none",
	});

	res.cookie("authRefreshToken", refreshToken, {
		maxAge: process.env.REFRESH_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		path: "/",
		sameSite: "none",
	});

	user.isEmailVerified = true;
	user.otp_code = undefined;
	user.refreshToken = refreshToken;

	await user.save();

	res.status(200).json({
		status: "success",
		user,
	});
});

export const resendVerification = catchAsync(async (req, res, next) => {
	const ip = req.ip;

	const { email } = req.body;
	const otp_code = generateOTP();

	if (!email) {
		return next(new AppError("Please provide your email!", 400));
	}

	const user = await User.findOne({ email });

	if (!user) {
		return next(new AppError("Couldn't find your account.", 404));
	}

	if (user.isEmailVerified) {
		return next(new AppError("login", 400));
	}

	user.otp_code = otp_code;
	await user.save();

	const { data, error } = await sendOTPEmail({ email, otp_code, ip });

	if (error) {
		return next(error);
	}

	res.status(200).json({
		status: "success",
		data,
	});
});

export const forgotPassword = catchAsync(async (req, res, next) => {
	const { email } = req.body;
	const ip = req.ip;

	const user = await User.findOne({ email });

	if (!user) {
		return next(new AppError("Couldn't find your account.", 404));
	}

	const resetToken = await user.createPasswordResetToken();
	await user.save();

	const resetUrl = `${process.env.FRONTEND_URL}/reset-password/?token=${resetToken}`;

	const { data, error } = await sendPasswordResetEmail({ email, resetUrl, ip });

	if (error) {
		user.passwordResetToken = undefined;
		user.passwordResetTokenExpires = undefined;
		await user.save();

		return next(error);
	}

	res.status(200).json({
		status: "success",
		data,
	});
});

export const resetPassword = catchAsync(async (req, res, next) => {
	const { resetToken, password } = req.body;
	const hashedResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");

	const user = await User.findOne({
		passwordResetToken: hashedResetToken,
		passwordResetTokenExpires: { $gt: Date.now() },
	});

	if (!user) {
		return next(new AppError("Token is invalid or has expired!", 400));
	}

	user.password = password;
	user.passwordResetToken = undefined;
	user.passwordResetTokenExpires = undefined;
	await user.save();

	res.status(200).json({
		status: "success",
		data: null,
	});
});

export const isLoggedIn = catchAsync(async (req, res, next) => {
	const refreshToken = req.cookies.authRefreshToken;
	const accessToken = req.cookies.authAccessToken;

	if (!refreshToken) {
		return next(new AppError("Login to get access", 401));
	}

	if (accessToken) {
		const decodedAccessToken = await promisify(jwt.verify)(accessToken, process.env.JWT_SECRET);

		const currentUser = await User.findById(decodedAccessToken.id);

		if (!currentUser) {
			return next(new AppError("Account couldn't be found", 404));
		}

		if (await currentUser.changedPasswordAfter(decodedAccessToken.iat)) {
			return next(new AppError("Login to gain access", 401));
		}

		req.user = currentUser;
		return next();
	} else {
		if (refreshToken) {
			const decodedRefreshToken = await promisify(jwt.verify)(refreshToken, process.env.JWT_SECRET);
			const hashedRefreshToken = crypto.createHash("sha256").update(refreshToken).digest("hex");

			const currentUser = await User.findOne({
				_id: decodedRefreshToken.id,
				refreshToken: hashedRefreshToken,
			});

			if (!currentUser) {
				return next(new AppError("Account couldn't be found", 404));
			}

			if (await currentUser.changedPasswordAfter(decodedRefreshToken.iat)) {
				return next(new AppError("Login to gain access", 401));
			}

			const newAccessToken = signToken(decodedRefreshToken.id, "access");

			res.cookie("authAccessToken", newAccessToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				path: "/",
				sameSite: "none",
				maxAge: 15 * 60 * 1000,
			});

			req.user = currentUser;
			return next();
		}
	}
});

export const canDelete = catchAsync(async (req, res, next) => {
	const refreshToken = req.cookies.authRefreshToken;

	if (!refreshToken) {
		return next(new AppError("Unauthorized", 401));
	}

	const decodedRefreshToken = await promisify(jwt.verify)(refreshToken, process.env.JWT_SECRET);
	const hashedRefreshToken = crypto.createHash("sha256").update(refreshToken).digest("hex");

	const currentUser = await User.findOne({
		_id: decodedRefreshToken.id,
		refreshToken: hashedRefreshToken,
	});

	if (!currentUser) {
		return next(new AppError("Account couldn't be found", 404));
	}

	if (await currentUser.changedPasswordAfter(decodedRefreshToken.iat)) {
		return next(new AppError("Unauthorized", 401));
	}

	req.user = currentUser;
	return next();
});

export const logout = catchAsync(async (req, res, next) => {
	const user = req.user;

	await User.findByIdAndUpdate({ _id: user.id }, { refreshToken: "" });

	res.clearCookie("authAccessToken", {
		httpOnly: true,
		sameSite: "none",
		secure: process.env.NODE_ENV === "production",
	});

	res.clearCookie("authRefreshToken", {
		httpOnly: true,
		sameSite: "none",
		secure: process.env.NODE_ENV === "production",
	});

	res.status(204).json({
		status: "success",
		data: null,
	});
});
