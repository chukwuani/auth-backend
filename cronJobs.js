import cron from "node-cron";
import { User } from "./models/userModel.js";

async function deleteUnverifiedUsers() {
	try {
		const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

		const unconfirmedUsers = await User.find({
			isEmailVerified: false,
			createdAt: { $lte: oneDayAgo },
		});

		for (const user of unconfirmedUsers) {
			await User.deleteOne({ _id: user._id });
			console.log(`Deleted unconfirmed user with ID: ${user._id} at ${new Date(Date.now())}`);
		}
	} catch (error) {
		console.error("Error deleting unverified users:", error);
	}
}

export default () => {
	cron.schedule("0 0 * * *", () => {
		deleteUnverifiedUsers();
		console.log(`Running a task ${new Date(Date.now())}`);
	});
};
