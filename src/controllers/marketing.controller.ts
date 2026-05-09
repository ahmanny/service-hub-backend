import { RequestHandler, Response } from "express";
import { MarketingService } from "../services/marketing.service";
import Exception from "../exceptions/Exception";

const marketingService = new MarketingService();

export const submitContact = (): RequestHandler => {
    return async (req: any, res: Response): Promise<void> => {
        try {
            const { name, email, phone, subject, message } = req.body;

            if (!name || !email || !subject || !message) {
                throw new Exception("Name, email, subject and message are required");
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                throw new Exception("Invalid email address");
            }

            if (message.length < 10) {
                throw new Exception("Message must be at least 10 characters");
            }

            await marketingService.sendContactEmail({ name, email, phone, subject, message });

            res.status(200).json({
                success: true,
                message: "Thank you for reaching out! We'll get back to you within 24 hours."
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || "Failed to submit contact form"
            });
        }
    };
};

export const submitReport = (): RequestHandler => {
    return async (req: any, res: Response): Promise<void> => {
        try {
            const { category, description, email, bookingId } = req.body;

            if (!category || !description) {
                throw new Exception("Category and description are required");
            }

            if (description.length < 20) {
                throw new Exception("Please provide a more detailed description (at least 20 characters)");
            }

            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                throw new Exception("Invalid email address");
            }

            await marketingService.sendReportEmail({ category, description, email, bookingId });

            res.status(200).json({
                success: true,
                message: "Your report has been submitted. Our team will review it and take action within 24-48 hours."
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || "Failed to submit report"
            });
        }
    };
};