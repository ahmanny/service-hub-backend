import mongoose, { Schema, Document, Types } from "mongoose";

export interface IWallet extends Document {
    providerId: Types.ObjectId;
    availableBalance: number;  // Money cleared for withdrawal
    pendingBalance: number;    // Escrow: Bookings paid but not yet completed
    totalEarned: number;       // Lifetime earnings (sum of all completed credits)
    currency: string;
    isActive: boolean;
    lastPayoutDate?: Date;
}

const WalletSchema = new Schema<IWallet>(
    {
        providerId: {
            type: Schema.Types.ObjectId,
            ref: "Provider",
            required: true,
            unique: true,
            index: true,
        },
        availableBalance: {
            type: Number,
            default: 0,
            min: 0,
        },
        pendingBalance: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalEarned: {
            type: Number,
            default: 0,
            min: 0,
        },
        currency: {
            type: String,
            default: "NGN",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastPayoutDate: {
            type: Date,
        },
    },
    { timestamps: true }
);

export const Wallet = mongoose.model<IWallet>("Wallet", WalletSchema);