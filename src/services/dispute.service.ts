import mongoose from "mongoose";
import { Booking } from "../models/booking.model";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import { BookingStatus, DisputeReason, PayoutStatus } from "../types/booking.types";
import Exception from "../exceptions/Exception";
import { Dispute } from "../models/dispute.model";
import { BookingStatusManager } from "../utils/booking-status-manager";

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
            const booking = await Booking.findById(payload.bookingId).session(session);
            if (!booking) throw new ResourceNotFoundException("Booking not found");

            if (booking.status !== BookingStatus.COMPLETION_PENDING) {
                throw new Exception("Dispute can only be raised during the completion window.");
            }

            if (booking.disputeDeadline && new Date() > booking.disputeDeadline) {
                throw new Exception("The dispute window has closed.");
            }

            const [dispute] = await Dispute.create([{
                bookingId: booking._id,
                raisedBy: 'customer',
                reason: payload.reason,
                description: payload.description,
                evidence: payload.evidence || [],
            }], { session });

            // Use the Manager for the status change to ensure side-effects are handled
            booking.payoutStatus = PayoutStatus.FROZEN;
            booking.disputeId = dispute._id;
            booking.isDisputed = true;
            
            await BookingStatusManager.transition(booking, BookingStatus.DISPUTED, session);

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