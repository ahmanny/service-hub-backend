import mongoose from "mongoose";
import { Schema, model, Document } from 'mongoose';

export interface IOtpSession extends Document {
    phone: string,
    otpHash: string,
    expiresAt: Date,
    verifyAttempts: number,
    sendCount: number,
    firstSentAt?: Date,
    lastSentAt: Date,
    cooldownUntil?: Date
    blockedUntil?: Date | null
}

const OtpSchema = new Schema<IOtpSession>({
    phone: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    otpHash: {
        type: String,
        required: true,
    },

    expiresAt: {
        type: Date,
        required: true,
    },
    verifyAttempts: {
        type: Number,
        default: 0,
    },

    sendCount: {
        type: Number,
        default: 0,
    },
    firstSentAt: {
        type: Date,
        default: Date.now,
    },
    lastSentAt: {
        type: Date,
        default: Date.now,
    },

    cooldownUntil: {
        type: Date,
        default: Date.now,
    },

    blockedUntil: {
        type: Date,
        default: null,
    },
}, { timestamps: true });





export const OtpSession = model('otpSession', OtpSchema);


export const getUserOtpById = (id: mongoose.Types.ObjectId) => OtpSession.findOne({ userId: id })
export const deleteUserOtpById = (id: mongoose.Types.ObjectId) => OtpSession.deleteOne({ userId: id })