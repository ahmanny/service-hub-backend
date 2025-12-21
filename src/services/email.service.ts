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
            console.log(error);
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
            console.log(error);
            throw new Exception("Could not send reset password link")
        }



    }




}



export const EmailService = new EmailServiceClass();