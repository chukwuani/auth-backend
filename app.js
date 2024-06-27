import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import ExpressMongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";

import userRouter from "./routes/userRoute.js";
import authRouter from "./routes/authRoute.js";

import { AppError } from "./utils/appError.js";
import { globalErrorHandler } from "./controllers/errorController.js";

// INITIALIZATION
const app = express();

// GLOBAL MIDDLEWARE
app.use(express.json());

app.use(cookieParser());

app.use(morgan("dev"));

app.use(
	cors({
		origin: "http://localhost:3000",
		credentials: true,
		methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
	})
);

app.options(
	cors({
		origin: "http://localhost:3000",
		credentials: true,
		methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
	})
);

app.use(helmet());

app.use(ExpressMongoSanitize());

app.use(xss());

app.use(
	rateLimit({
		windowMs: 60 * 60 * 1000, // 1 hour
		limit: 1000, // Limit each IP to 100 requests per `window` (here, per 1 hour).
		message: "You have reached your limit. Go and touch grass, come back in an hour",
	})
);

// ROUTES
app.use("/api/v1/user", userRouter);
app.use("/api/v1/auth", authRouter);

// UNHANDLED ROUTES
app.all("*", (req, res, next) => {
	next(new AppError(`Can't find ${req.originalUrl}`, 404));
});

// GLOBAL ERROR HANDLING
app.use(globalErrorHandler);

export default app;
