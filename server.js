import app from "./app.js";

import dotenv from "dotenv";
import mongoose from "mongoose";
import cronJobs from "./cronJobs.js";

dotenv.config();

mongoose
	.connect(process.env.DATABASE_URL, {
		serverApi: { version: "1", strict: true, deprecationErrors: true },
		autoIndex: true,
	})
	.then(() => console.log("You successfully connected to MongoDB!"))
	.catch(console.error);

cronJobs();

app.listen(process.env.PORT, () => {
	console.log(`Server running on http://localhost:${process.env.PORT}`);
});
