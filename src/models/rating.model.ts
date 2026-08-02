import mongoose, { Schema, Document, Types, model } from "mongoose";

export interface IRating extends Document {
    bookingId: Types.ObjectId;
    providerId: Types.ObjectId;
    consumerId: Types.ObjectId;
    rating: number; // 1-5
    comment?: string;
    tags?: string[];
    createdAt: Date;
}

const RatingSchema = new Schema<IRating>({
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    providerId: { type: Schema.Types.ObjectId, ref: "Provider", required: true, index: true },
    consumerId: { type: Schema.Types.ObjectId, ref: "Consumer", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
    tags: [{ type: String }],
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Rating = model<IRating>("Rating", RatingSchema);