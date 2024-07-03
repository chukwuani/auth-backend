import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { catchAsync } from "../utils/catchAsync.js";

import crypto from "crypto";
import dotenv from "dotenv";
import { User } from "../models/userModel.js";
import { AppError } from "../utils/appError.js";

dotenv.config();

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const bucketAccessKey = process.env.BUCKET_ACCESS_KEY;
const bucketSecretAccessKey = process.env.BUCKET_SECRET_ACCESS_KEY;

const s3 = new S3Client({
	credentials: {
		accessKeyId: bucketAccessKey,
		secretAccessKey: bucketSecretAccessKey,
	},
	region: bucketRegion,
});

const randomImageName = () => crypto.randomBytes(32).toString("hex");

export const getCurrentUser = catchAsync(async (req, res, next) => {
	let user = req.user;

	if (user.imageName) {
		const params = {
			Bucket: bucketName,
			Key: user.imageName,
		};

		const getCommand = new GetObjectCommand(params);
		const url = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });

		user.imageUrl = url;
	}

	res.status(200).json({
		status: "success",
		user,
	});
});

export const updateUserPhoto = catchAsync(async (req, res, next) => {
	const buffer = req.file.buffer;
	const imageName = randomImageName();
	const user = req.user;

	if (user.imageName) {
		const deleteParams = {
			Bucket: bucketName,
			Key: user.imageName,
		};

		const deleteCommand = new DeleteObjectCommand(deleteParams);
		await s3.send(deleteCommand);
	}

	const putParams = {
		Bucket: bucketName,
		Key: imageName,
		Body: buffer,
		ContentType: req.file.mimetype,
	};

	const putCommand = new PutObjectCommand(putParams);
	await s3.send(putCommand);

	user.imageName = imageName;
	await user.save();

	console.log("File:", req.file);

	res.status(200).json({
		status: "success",
		data: user,
	});
});

export const updateUserProfile = catchAsync(async (req, res, next) => {
	const currentUser = req.user;

	const { firstname, lastname } = req.body;

	if (!firstname || !lastname) {
		return next(new AppError("Please provide your firstname and lastname!", 400));
	}

	currentUser.firstname = firstname;
	currentUser.lastname = lastname;

	await currentUser.save();

	res.status(200).json({
		status: "success",
		data: {
			user: currentUser,
		},
	});
});

export const changeUserPassword = catchAsync(async (req, res, next) => {
	const user = req.user;

	const currentUser = await User.findById(user.id).select("+password");

	const { oldPassword, newPassword } = req.body;

	if (!oldPassword || !newPassword) {
		return next(new AppError("Please provide your current and old password!", 400));
	}

	if (!(await user.correctPassword(oldPassword, currentUser.password))) {
		return next(new AppError("Old password is incorrect. Please try again.", 400));
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
	user.password = newPassword;
	await user.save();

	res.status(200).json({
		status: "success",
		user,
	});
});

export const deleteUser = catchAsync(async (req, res, next) => {
	const user = req.user;

	if (user.imageName) {
		const deleteParams = {
			Bucket: bucketName,
			Key: user.imageName,
		};

		const deleteCommand = new DeleteObjectCommand(deleteParams);
		await s3.send(deleteCommand);
	}

	await User.findByIdAndDelete(user.id);

	res.status(204).json({
		status: "success",
		data: null,
	});
});
