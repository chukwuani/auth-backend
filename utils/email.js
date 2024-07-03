import dotenv from "dotenv";

import { Resend } from "resend";
import moment from "moment";

dotenv.config();

async function getLocation(ip) {
	try {
		const response = await fetch(`https://ipapi.co/${ip}/json/`);

		const data = await response.json();
		return data;
	} catch (error) {
		console.log(error);

		return null;
	}
}

function getCurrentUTCTime() {
	return moment.utc().format("DD MMMM YYYY, HH:mm [UTC]");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTPEmail = async ({ email, otp_code, ip }) => {
	const location = await getLocation(ip);
	const formattedTime = getCurrentUTCTime();

	const html = `
    <html>
	<head>
		<title>${otp_code} is your verification code</title>
	</head>
	<body
		background-color="#fff"
		padding="48px 32px 48px 32px">
						<table
							cellpadding="0"
							cellspacing="0"
							border="0"
							width="600"
							class="m_5595294993237382795container"
							style="width: 600px; border-collapse: separate">
							<tbody>
								<tr>
									<td
										align="left"
										valign="top"
										bgcolor="#fff"
										style="
											vertical-align: top;
											line-height: 1;
											background-color: #ffffff;
											border-radius: 0px;
										">
										<table
											cellpadding="0"
											cellspacing="0"
											border="0"
											width="100%"
											style="width: 100%; border-collapse: separate">
											<tbody>
												<tr>
													<td
														align="left"
														valign="top"
														bgcolor="#ffffff"
														style="
															vertical-align: top;
															line-height: 1;
															padding: 32px 32px 48px;
															background-color: #ffffff;
															border-radius: 0px;
														">
														<h1
															align="left"
															style="
																padding: 0px;
																margin: 0px;
																font-style: normal;
																font-family: Helvetica, Arial, sans-serif;
																font-size: 32px;
																line-height: 39px;
																color: #000000;
																font-weight: bold;
															">
															Verification code
														</h1>
														<p
															align="left"
															style="
																padding: 0px;
																margin: 32px 0px 0px;
																font-family: Helvetica, Arial, sans-serif;
																color: #000000;
																font-size: 14px;
																line-height: 21px;
															">
															Enter the following verification code when prompted:
														</p>
														<p
															style="
																padding: 0px;
																margin: 16px 0px 0px;
																font-family: Helvetica, Arial, sans-serif;
																color: #000000;
																font-size: 40px;
																line-height: 60px;
															">
															<b> ${otp_code}</b>
														</p>
														<p
															style="
																padding: 0px;
																margin: 16px 0px 0px;
																font-family: Helvetica, Arial, sans-serif;
																color: #000000;
																font-size: 14px;
																line-height: 21px;
															">
															To protect your account, do not share this code.
														</p>
														<p
															style="
																padding: 0px;
																margin: 64px 0px 0px;
																font-family: Helvetica, Arial, sans-serif;
																color: #000000;
																font-size: 14px;
																line-height: 21px;
															">
															<b>Didn't request this?</b>
														</p>
														<p
															style="
																padding: 0px;
																margin: 4px 0px 0px;
																font-family: Helvetica, Arial, sans-serif;
																color: #000000;
																font-size: 14px;
																line-height: 21px;
															">
															This magic link was requested from <b>${location?.region}, ${location?.country_code}</b> at
															<b>${formattedTime}</b>. If you didn't make this request, you can
															safely ignore this email.
														</p>
													</td>
												</tr>
											</tbody>
										</table>
									</td>
								</tr>
							</tbody>
						</table>
					</td>
				</tr>
			</tbody>
		</table>
	</body>
</html>
    `;

	const { data, error } = await resend.emails.send({
		from: "AuthKeeper@royalexchangex.com",
		to: [email],
		subject: `${otp_code} is your verification code`,
		html,
	});

	return { data, error };
};

export const sendPasswordResetEmail = async ({ email, resetUrl, ip }) => {
	const location = await getLocation(ip);
	const formattedTime = getCurrentUTCTime();

	const html = `
    <html>
	<head>
		<title>Password Reset Request</title>
	</head>
	<body
		background-color="#fff"
		padding="48px 32px 48px 32px">
						<table
							cellpadding="0"
							cellspacing="0"
							border="0"
							width="600"
							class="m_5595294993237382795container"
							style="width: 600px; border-collapse: separate">
							<tbody>
								<tr>
									<td
										align="left"
										valign="top"
										bgcolor="#fff"
										style="
											vertical-align: top;
											line-height: 1;
											background-color: #ffffff;
											border-radius: 0px;
										">
										<table
											cellpadding="0"
											cellspacing="0"
											border="0"
											width="100%"
											style="width: 100%; border-collapse: separate">
											<tbody>
												<tr>
													<td
														align="left"
														valign="top"
														bgcolor="#ffffff"
														style="
															vertical-align: top;
															line-height: 1;
															padding: 32px 32px 48px;
															background-color: #ffffff;
															border-radius: 0px;
														">
														<h1
															align="left"
															style="
																padding: 0px;
																margin: 0px;
																font-style: normal;
																font-family: Helvetica, Arial, sans-serif;
																font-size: 32px;
																line-height: 39px;
																color: #000000;
																font-weight: bold;
															">
															Forgot your password?
														</h1>
														
														<p
															style="
																padding: 0px;
																margin: 16px 0px 0px;
																font-family: Helvetica, Arial, sans-serif;
																color: #000000;
																font-size: 14px;
																line-height: 21px;
															">
															Click the button below to create a new password. This link will
															expire in 10 minutes.
														</p>
														<table
															cellpadding="0"
															cellspacing="0"
															border="0"
															width="auto"
															style="
																width: auto;
																font-size: 14px;
																font-weight: normal;
																background-color: #6c47ff;
																color: #ffffff;
																border-radius: 8px;
																border-collapse: separate;
																margin: 32px 0px 0px;
															">
															<tbody>
																<tr>
																	<td
																		align="center"
																		valign="top"
																		bgcolor="#6c47ff"
																		style="
																			vertical-align: top;
																			line-height: 1;
																			text-align: center;
																			font-family: Helvetica, Arial, sans-serif;
																			border-radius: 8px;
																		">
																		<a
																			href=${resetUrl}
																			style="
																				display: inline-block;
																				box-sizing: border-box;
																				text-decoration: none;
																				margin: 0px;
																				font-family: Helvetica, Arial, sans-serif;
																				font-size: 14px;
																				font-weight: normal;
																				background-color: #6c47ff;
																				color: #ffffff;
																				border-radius: 8px;
																				border: 1px solid #6c47ff;
																				padding: 15px 24px;
																			"
																			target="_blank"
																			>Create new password</a
																		>
																	</td>
																</tr>
															</tbody>
														</table>
														<p
															style="
																padding: 0px;
																margin: 16px 0px 64px;
																font-family: Helvetica, Arial, sans-serif;
																color: #000000;
																font-size: 14px;
																line-height: 21px;
															">
															If you're having trouble with the above button,
															<a
																href=${resetUrl}
																style="
																	font-size: 14px;
																	color: #6c47ff;
																	font-family: Helvetica, Arial, sans-serif;
																	font-weight: normal;
																	line-height: 1.5;
																	text-decoration: underline;
																"
																target="_blank"
																>click here</a
															>.
														</p>
														<p
															style="
																padding: 0px;
																margin: 4px 0px 0px;
																font-family: Helvetica, Arial, sans-serif;
																color: #000000;
																font-size: 14px;
																line-height: 21px;
															">
															This magic link was requested from <b>${location?.region}, ${location?.country_code}</b> at
															<b>${formattedTime}</b>. If you didn't make this request, you can
															safely ignore this email.
														</p>
													</td>
												</tr>
											</tbody>
										</table>
									</td>
								</tr>
							</tbody>
						</table>
					</td>
				</tr>
			</tbody>
		</table>
	</body>
</html>
    `;

	const { data, error } = await resend.emails.send({
		from: "AuthKeeper@royalexchangex.com",
		to: [email],
		subject: "Password Reset Request",
		html,
	});

	return { data, error };
};
