import { ClientSession } from "mongoose";
import { BookingStatus, PaymentStatus } from "../types/booking.types";
import Exception from "../exceptions/Exception";
import { canTransitionTo } from "./booking-state.utils";
import { IBooking } from "../models/booking.model";

export class BookingStatusManager {
    public static async transition(
        booking: IBooking,
        nextStatus: BookingStatus,
        session?: ClientSession
    ): Promise<any> {
        // Validate the flow
        if (!canTransitionTo(booking.status as BookingStatus, nextStatus)) {
            throw new Exception(`Invalid status transition from ${booking.status} to ${nextStatus}`);
        }

        // Set Status
        booking.status = nextStatus;

        const now = new Date();
        switch (nextStatus) {
            case BookingStatus.ACCEPTED:
                booking.acceptedAt = now;
                break;

            case BookingStatus.DECLINED:
                booking.declinedAt = now;
                break;

            case BookingStatus.CANCELLED:
                booking.cancelledAt = now;
                break;

            case BookingStatus.IN_PROGRESS:
                // Guard: don't allow start if consumer hasn't paid
                if (booking.paymentStatus !== PaymentStatus.HELD) {
                    throw new Exception(
                        "Cannot start service — payment has not been received yet."
                    );
                }
                booking.actualStartTime = now;
                break;

            case BookingStatus.COMPLETION_PENDING:
                booking.completionPendingAt = now;
                booking.disputeDeadline = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
                break;

            case BookingStatus.DISPUTED:
                booking.disputedAt = now;
                booking.disputeDeadline = undefined; // Clear dispute deadline since it's now in dispute
                break;

            case BookingStatus.CANCELLED_REFUNDED:
                booking.refundedAt = now;
                break;

            case BookingStatus.COMPLETED:
                // Final terminal state side-effects
                booking.completedAt = now;
                break;
        }

        // The save() now works because we typed booking as 'any' or 'Document'
        return await booking.save({ session });
    }
}