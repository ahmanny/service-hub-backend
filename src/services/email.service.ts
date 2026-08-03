import { getOtpEmailContent } from "../utils/otp.utils";
import mailjetClient from "../configs/mailjet.config";
import Exception from "../exceptions/Exception";
import jwt from 'jsonwebtoken';
import { SendResetPasswordLinkEmailPayload } from "../types/email.types";
import { getVerificationEmailContent } from "../utils/email.utils";







class EmailServiceClass {
    constructor() {
        // super()
    }
    // send otp to user for email confirmation
    public async sendOtpEmail(user_email: string, otp: string) {

        const emailContent = await getOtpEmailContent({ otpCode: otp })
        try {
            await mailjetClient

                .post("send", { version: "v3.1" })
                .request({
                    Messages: [
                        {
                            From: {
                                Email: process.env.EMAIL_FROM,
                                Name: "ServiceHub"
                            },
                            To: [
                                {
                                    Email: user_email,
                                }
                            ],
                            Subject: "Your OTP Code",
                            HTMLPart: emailContent
                        }
                    ]
                });
            return 'Otp sent succesfully';
        } catch (error) {
            
            throw new Exception("Could not send otp")
        }
    }



    public async sendUserResetPasswordEmail(payload: SendResetPasswordLinkEmailPayload) {

        const secret = process.env.JWT_SECRET as string
        const resetToken = jwt.sign({ id: payload.id }, secret, { expiresIn: "1d" })


        const content = await getVerificationEmailContent({
            token: resetToken,
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
        })

        try {
            await mailjetClient

                .post("send", { version: "v3.1" })
                .request({
                    Messages: [
                        {
                            From: {
                                Email: process.env.EMAIL_FROM,
                                Name: "Service Hub"
                            },
                            To: [
                                {
                                    Email: payload.email,
                                    Name: `${payload.firstName} ${payload.lastName}`.trim()
                                }
                            ],
                            Subject: "Reset Password",
                            HTMLPart: content
                        }
                    ]
                });
            return 'reset password link was sent succesfully';

        } catch (error) {
            throw new Exception("Could not send reset password link")
        }
    }

    public async sendVerificationOtpEmail(payload: { email: string; otpCode: string; verificationUrl: string; name?: string }) {
        const { email, otpCode, verificationUrl, name } = payload;
        const htmlPart = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #111827; font-size: 24px; font-weight: 800; margin: 0;">Verify Your Email Address</h2>
                <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Proxxi Security</p>
            </div>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">
                Hello ${name || 'there'},<br/><br/>
                Please use the 6-digit verification code below in your Proxxi mobile app to verify your email address:
            </p>
            
            <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5;">${otpCode}</span>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 8px; margin-bottom: 0;">This code expires in 10 minutes</p>
            </div>

            <p style="color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 24px;">
                Or verify with a single tap on desktop or web browser:
            </p>

            <div style="text-align: center; margin-bottom: 32px;">
                <a href="${verificationUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 700; display: inline-block;">Verify Email Now</a>
            </div>

            <hr style="border: none; border-top: 1px solid #f3f4f6; margin-bottom: 24px;" />
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                If you did not request this email, please ignore it.
            </p>
        </div>
        `;

        try {
            await mailjetClient
                .post("send", { version: "v3.1" })
                .request({
                    Messages: [
                        {
                            From: {
                                Email: process.env.EMAIL_FROM || "noreply@proxxi.app",
                                Name: "Proxxi"
                            },
                            To: [
                                {
                                    Email: email,
                                    Name: name || "Proxxi User"
                                }
                            ],
                            Subject: `${otpCode} is your Proxxi verification code`,
                            HTMLPart: htmlPart
                        }
                    ]
                });
            return true;
        } catch (error) {
            console.error("Mailjet send error:", error);
            throw new Exception("Could not send verification email");
        }
    }
}



export const EmailService = new EmailServiceClass();