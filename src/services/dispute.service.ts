import mongoose from "mongoose";
import { Booking } from "../models/booking.model";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import { BookingStatus, DisputeReason, PayoutStatus } from "../types/booking.types";
import Exception from "../exceptions/Exception";
import { Dispute } from "../models/dispute.model";
import { WalletService } from "./wallet/wallet.service";

export class DisputeService {
    public static async raiseDispute(payload: {
        bookingId: string;
        userId: string;
        reason: DisputeReason;
        description: string;
        evidence?: string[];
    }, existingSession?: mongoose.ClientSession) { // Added session support
        const session = existingSession || await mongoose.startSession();
        if (!existingSession) session.startTransaction();

        try {
            const now = new Date();
            const booking = await Booking.findOneAndUpdate(
                {
                    _id: payload.bookingId,
                    consumerId: payload.userId,
                    status: BookingStatus.COMPLETION_PENDING,
                    isDisputed: { $ne: true },
                    disputeDeadline: { $gte: now },
                },
                {
                    $set: {
                        status: BookingStatus.DISPUTED,
                        payoutStatus: PayoutStatus.FROZEN,
                        disputedAt: now,
                        isDisputed: true,
                    },
                    $unset: {
                        disputeDeadline: "",
                    },
                },
                { new: true, session }
            );
            if (!booking) throw new ResourceNotFoundException("Booking not found");

            const [dispute] = await Dispute.create([{
                bookingId: booking._id,
                raisedBy: 'customer',
                reason: payload.reason,
                description: payload.description,
                evidence: payload.evidence || [],
            }], { session });

            booking.disputeId = dispute._id;
            await booking.save({ session });
            await WalletService.holdForDispute(booking, session);

            if (!existingSession) await (session as mongoose.ClientSession).commitTransaction();
            return dispute;
        } catch (error) {
            if (!existingSession) await (session as mongoose.ClientSession).abortTransaction();
            throw error;
        } finally {
            if (!existingSession) session.endSession();
        }
    }
}
