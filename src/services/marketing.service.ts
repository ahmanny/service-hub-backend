import mailjetClient from "../configs/mailjet.config";
import { getContactEmailContent } from "../utils/contactEmail.utils";
import { getReportEmailContent } from "../utils/reportEmail.utils";

export class MarketingService {

    public async sendContactEmail(payload: {
        name: string;
        email: string;
        phone?: string;
        subject: string;
        message: string;
    }): Promise<void> {
        const { name, email, phone, subject, message } = payload;

        const htmlContent = await getContactEmailContent({ name, email, phone, subject, message });

        await mailjetClient
            .post("send", { version: "v3.1" })
            .request({
                Messages: [
                    {
                        From: {
                            Email: process.env.EMAIL_FROM || "noreply@proxxi.app",
                            Name: "Proxxi Contact"
                        },
                        To: [
                            {
                                Email: process.env.EMAIL_FROM || "hello@proxxi.app",
                            }
                        ],
                        Subject: `[Contact Form] ${subject}`,
                        HTMLPart: htmlContent,
                        ReplyTo: {
                            Email: email,
                            Name: name
                        }
                    }
                ]
            });
    }

    public async sendReportEmail(payload: {
        category: string;
        description: string;
        email?: string;
        bookingId?: string;
    }): Promise<void> {
        const { category, description, email, bookingId } = payload;

        const htmlContent = await getReportEmailContent({ category, description, email, bookingId });

        await mailjetClient
            .post("send", { version: "v3.1" })
            .request({
                Messages: [
                    {
                        From: {
                            Email: process.env.EMAIL_FROM || "noreply@proxxi.app",
                            Name: "Proxxi Report"
                        },
                        To: [
                            {
                                Email: process.env.EMAIL_FROM || "support@proxxi.app",
                            }
                        ],
                        Subject: `[Report - ${category}] Issue reported via Proxxi`,
                        HTMLPart: htmlContent,
                        ...(email ? {
                            ReplyTo: {
                                Email: email,
                                Name: "Proxxi Reporter"
                            }
                        } : {})
                    }
                ]
            });
    }
}