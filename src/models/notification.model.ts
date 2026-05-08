import mongoose, { Schema, Document, Types } from "mongoose";

export interface INotification extends Document {
    userId: Types.ObjectId;
    role: "consumer" | "provider";
    title: string;
    body: string;
    type: "welcome" | "booking" | "payment" | "withdrawal" | "approval" | "system";
    data?: Record<string, any>;
    isRead: boolean;
    createdAt: Date;
    readAt?: Date;
}

const NotificationSchema = new Schema<INotification>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        role: {
            type: String,
            enum: ["consumer", "provider"],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        body: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ["welcome", "booking", "payment", "withdrawal", "approval", "system"],
            default: "system",
        },
        data: {
            type: Schema.Types.Mixed,
            default: {},
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);