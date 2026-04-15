import { Request, RequestHandler, Response } from "express";
import crypto from "crypto";
import { PaymentService } from "../services/payment.service";
import { ok_handler, error_handler } from "../utils/response_handler";
import { BookingService } from "../services/booking.service";

/**
 * Initialize payment for a booking.
 * Called by consumer after provider accepts.
 */
export const initializePayment = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { bookingId } = req.params;
            const consumer = req.consumerProfile;
            if (!consumer) throw new Error("Unauthorized");

            const booking = await (await import("../models/booking.model")).Booking
                .findById(bookingId);
            if (!booking) throw new Error("Booking not found");

            const data = await PaymentService.initializePayment({
                bookingId,
                userId: consumer.userId.toString(),
                amountKobo: booking.price.total * 100,
            });

            ok_handler(res, "Payment initialized", data);
        } catch (error) {
            error_handler(error, req, res);
        }
    };
};
/**
 * Paystack webhook — listens for payment events.
 * Must be publicly accessible (no auth middleware).
 */

export const paystackWebhook = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {

            const signature = req.headers['x-paystack-signature'];
            const secret = process.env.PAYSTACK_SECRET_KEY || "";
            const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
            if (hash !== signature) {
                console.warn("Invalid Paystack signature");
                res.sendStatus(401);
                return;
            }

            const { event, data } = req.body;


            if (event === "charge.success") {
                await PaymentService.handlePaymentSuccess(data.reference);
            } else if (event === "transfer.success") {
                console.log("Payout success event received for transfer code:", data.transfer_code);
                // await PaymentService.handlePayoutSuccess(data.transfer_code);
            } else if (event === "refund.success") {
                console.log("Refund success event received for reference:", data.reference);
                // await PaymentService.handleRefundSuccess(data.reference);
            } else {
                console.log(`Unhandled Paystack event: ${event}`);
            }

            res.sendStatus(200); // Acknowledge receipt to Paystack

        } catch (error) {
            console.error("Webhook error:", error);
            res.sendStatus(200); // Always return 200 to Paystack
        }
    };
};