import mongoose, { Schema, Document, Types } from "mongoose";
import { DisputeReason, DisputeResolution } from "../types/booking.types";

export interface IDispute extends Document {
    bookingId: Types.ObjectId;
    raisedBy: 'customer' | 'provider';
    reason: DisputeReason;
    description: string;
    evidence: string[]; // URLs to photos
    resolution: DisputeResolution;
    resolvedAt?: Date;
    adminNotes?: string;

    createdAt?: Date;
    updatedAt?: Date;
}

const DisputeSchema = new Schema<IDispute>({
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    raisedBy: { type: String, enum: ['customer', 'provider'], required: true },
    reason: { type: String, enum: Object.values(DisputeReason), required: true },
    description: { type: String, required: true },
    evidence: [{ type: String }],
    resolution: { type: String, enum: Object.values(DisputeResolution), default: DisputeResolution.PENDING },
    resolvedAt: { type: Date },
    adminNotes: { type: String },
}, { timestamps: true });

export const Dispute = mongoose.model<IDispute>("Dispute", DisputeSchema);