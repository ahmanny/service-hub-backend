import { Document, Schema, Types, model } from "mongoose";
import { PaymentStatus } from "../types/booking.types";


export interface IPayment extends Document {
    bookingId: Types.ObjectId;
    reference: string;
    amount: number; // in naira
    status: PaymentStatus;
    transferCode?: string;
    paidAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

const PaymentSchema = new Schema<IPayment>(
    {
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
            required: true,
            index: true,
        },
        reference: {
            type: String,
            required: true,
            unique: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(PaymentStatus),
            default: PaymentStatus.PENDING,
        },
        transferCode: { type: String },
        paidAt: { type: Date },
    },
    { timestamps: true }
);

export const Payment = model<IPayment>("Payment", PaymentSchema);
