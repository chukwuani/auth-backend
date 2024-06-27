import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";

import crypto from "crypto";

const UserSchema = new mongoose.Schema({
	firstname: { type: String, required: [true, "What is your first name?"] },
	lastname: { type: String, required: [true, "What is your last name?"] },
	email: {
		type: String,
		required: [true, "Please provide an email"],
		unique: true,
		lowercase: true,
		validate: [validator.isEmail, "Enter a valid email"],
	},
	role: {
		type: String,
		enum: ["user", "admin", "super_admin"],
		default: "user",
	},
	password: {
		type: String,
		required: [true, "Please provide a password"],
		select: false,
		minlength: 8,
	},
	passwordChangedAt: Date,
	passwordResetToken: String,
	passwordResetTokenExpires: Date,
	imageUrl: { type: {}, default: null },
	imageName: { type: {}, default: null },
	isEmailVerified: {
		type: Boolean,
		default: false,
	},
	otp_code: {
		type: String,
		minlength: 6,
		select: false,
	},
	createdAt: {
		type: Date,
		default: Date.now(),
	},
	refreshToken: {
		type: String,
		select: false,
	},
});

UserSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();

	this.password = await bcrypt.hash(this.password, 16);
	next();
});

UserSchema.pre("save", function (next) {
	if (!this.isModified("otp_code") || this.otp_code === undefined) return next();

	this.otp_code = crypto.createHash("sha256").update(this.otp_code).digest("hex");
	next();
});

UserSchema.pre("save", function (next) {
	if (!this.isModified("refreshToken") || this.refreshToken === undefined) return next();

	this.refreshToken = crypto.createHash("sha256").update(this.refreshToken).digest("hex");
	next();
});

UserSchema.pre("save", function (next) {
	if (!this.isModified("password") || this.isNew) return next();

	this.passwordChangedAt = Date.now() - 1000;
	next();
});

UserSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
	return await bcrypt.compare(candidatePassword, userPassword);
};

UserSchema.methods.changedPasswordAfter = async function (JWTTimeStamp) {
	if (this.passwordChangedAt) {
		const changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000);

		return JWTTimeStamp < changedTimeStamp;
	}

	return false;
};

UserSchema.methods.createPasswordResetToken = async function () {
	const resetToken = crypto.randomBytes(32).toString("hex");

	this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
	this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;

	return resetToken;
};

const User = mongoose.model("User", UserSchema);

User.createIndexes();

export { User };
