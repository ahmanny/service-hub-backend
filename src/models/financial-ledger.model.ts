import mongoose, { Document, Schema, Types } from "mongoose";
import { FinancialStatus, LedgerEntryType } from "../types/booking.types";

export interface IFinancialLedgerEntry extends Document {
    bookingId: Types.ObjectId;
    providerId: Types.ObjectId;
    paymentId?: Types.ObjectId;
    walletId?: Types.ObjectId;
    entryType: LedgerEntryType;
    fromStatus?: FinancialStatus;
    toStatus: FinancialStatus;
    amount: number;
    currency: string;
    idempotencyKey: string;
    reference?: string;
    metadata?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}

const FinancialLedgerSchema = new Schema<IFinancialLedgerEntry>(
    {
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
            required: true,
            index: true,
        },
        providerId: {
            type: Schema.Types.ObjectId,
            ref: "Provider",
            required: true,
            index: true,
        },
        paymentId: {
            type: Schema.Types.ObjectId,
            ref: "Payment",
        },
        walletId: {
            type: Schema.Types.ObjectId,
            ref: "Wallet",
        },
        entryType: {
            type: String,
            enum: Object.values(LedgerEntryType),
            required: true,
        },
        fromStatus: {
            type: String,
            enum: Object.values(FinancialStatus),
        },
        toStatus: {
            type: String,
            enum: Object.values(FinancialStatus),
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            default: "NGN",
        },
        idempotencyKey: {
            type: String,
            required: true,
            unique: true,
        },
        reference: {
            type: String,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    { timestamps: true }
);

FinancialLedgerSchema.index({ bookingId: 1, entryType: 1 }, { unique: true });
FinancialLedgerSchema.index({ providerId: 1, createdAt: -1 });

export const FinancialLedger = mongoose.model<IFinancialLedgerEntry>(
    "FinancialLedger",
    FinancialLedgerSchema
);
