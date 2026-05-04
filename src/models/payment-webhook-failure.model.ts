import mongoose, { Document, Schema } from "mongoose";

export interface IPaymentWebhookFailure extends Document {
    event?: string;
    reference?: string;
    payload: Record<string, any>;
    error: string;
    retryable: boolean;
    processedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

const PaymentWebhookFailureSchema = new Schema<IPaymentWebhookFailure>(
    {
        event: { type: String, index: true },
        reference: { type: String, index: true },
        payload: { type: Schema.Types.Mixed, required: true },
        error: { type: String, required: true },
        retryable: { type: Boolean, default: true },
        processedAt: { type: Date },
    },
    { timestamps: true }
);

export const PaymentWebhookFailure = mongoose.model<IPaymentWebhookFailure>(
    "PaymentWebhookFailure",
    PaymentWebhookFailureSchema
);
