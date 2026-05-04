// models/transaction.model.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITransaction extends Document {
    walletId: Types.ObjectId;
    providerId: Types.ObjectId;
    bookingId?: Types.ObjectId; // Optional: linked to a specific job
    amount: number;
    type: "credit" | "debit";
    status: "pending" | "completed" | "failed" | "reversed";
    purpose: "booking_revenue" | "escrow" | "withdrawal" | "refund" | "platform_fee" | "bonus";
    reference: string;          // Unique ref 
    description: string;
    metadata?: Record<string, any>;
    clearsAt?: Date;

    createdAt?: Date;
    updatedAt?: Date;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        walletId: {
            type: Schema.Types.ObjectId,
            ref: "Wallet",
            required: true,
            index: true,
        },
        providerId: {
            type: Schema.Types.ObjectId,
            ref: "Provider",
            required: true,
            index: true,
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
        },
        amount: {
            type: Number,
            required: true,
        },
        type: {
            type: String,
            enum: ["credit", "debit"],
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "completed", "failed", "reversed"],
            default: "pending",
            index: true,
        },
        purpose: {
            type: String,
            enum: ["booking_revenue", "escrow", "withdrawal", "refund", "platform_fee", "bonus"],
            required: true,
        },
        reference: {
            type: String,
            unique: true,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
        clearsAt: {
            type: Date,
            index: true,
        },
    },
    { timestamps: true }
);

// Index for fast lookups on history
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ bookingId: 1, purpose: 1, type: 1 }, { unique: true, sparse: true });

export const Transaction = mongoose.model<ITransaction>("Transaction", TransactionSchema);
