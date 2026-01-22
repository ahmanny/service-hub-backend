import mongoose, { Schema, Types } from "mongoose";
import { GeoAddress, GeoPointSchema } from "./schemas/geoPoint.schema";
import { IProviderShopAddress } from "./provider.model";



export interface IBooking {
    consumerId: Types.ObjectId;
    providerId: Types.ObjectId;

    service: string;
    serviceName: string;
    serviceType:
    | "barber"
    | "hair_stylist"
    | "electrician"
    | "plumber"
    | "house_cleaning";

    price: {
        service: number;
        homeServiceFee?: number;
        platformFee?: number;
        total: number;
    };

    scheduledAt: Date;
    deadlineAt?: Date;
    cancelledAt?: Date;
    declinedAt?: Date;
    acceptedAt?: Date;
    rescheduledAt?: Date;


    location: {
        type: "home" | "shop";
        geoAddress?: GeoAddress;
        textAddress?: string | IProviderShopAddress;
    }

    note?: string;
    declineReason?: string;
    expiredMessage?: string;
    cancelMessage?: string;

    status: "pending" | "accepted" | "declined" | "completed" | "cancelled" | "expired" | "in_progress";

    actualStartTime?: Date;
    autoStarted: boolean; // True if the cron job moved it to in_progress
    isDisputed: boolean;  // If the customer flags a no-show

    createdAt?: Date;
    updatedAt?: Date;
}



const BookingSchema = new Schema<IBooking>(
    {
        consumerId: {
            type: Schema.Types.ObjectId,
            ref: "Consumer",
            required: true,
            index: true,
        },

        providerId: {
            type: Schema.Types.ObjectId,
            ref: "Provider",
            required: true,
            index: true,
        },

        service: {
            type: String,
            required: true,
        },

        serviceName: {
            type: String,
            required: true,
        },

        price: {
            service: { type: Number, required: true, min: 0 },
            homeServiceFee: { type: Number, default: 0 },
            platformFee: { type: Number, default: 0 },
            total: { type: Number, required: true, min: 0 },
        },

        serviceType: {
            type: String,
            enum: [
                "barber",
                "hair_stylist",
                "electrician",
                "plumber",
                "house_cleaning",
            ],
            required: true,
            index: true,
        },

        scheduledAt: {
            type: Date,
            required: true,
        },

        location: {
            type: {
                type: String,
                enum: ["home", "shop"],
                required: true,
            },

            geoAddress: {
                type: GeoPointSchema,
                required: false,
            },

            textAddress: {
                type: Schema.Types.Mixed,
                required: false,
            },
        },

        note: {
            type: String,
            trim: true,
        },
        declineReason: {
            type: String,
            trim: true,
        },
        expiredMessage: {
            type: String,
            trim: true,
        },
        cancelMessage: {
            type: String,
            trim: true,
        },

        status: {
            type: String,
            enum: ["pending", "accepted", "declined", "completed", "cancelled", "expired", "in_progress"],
            default: "pending",
            index: true,
        },

        actualStartTime: { type: Date },
        autoStarted: { type: Boolean, default: false },
        isDisputed: { type: Boolean, default: false },

        deadlineAt: {
            type: Date,
            index: true
        },
        acceptedAt: {
            type: Date,
            index: true
        },
        cancelledAt: {
            type: Date,
            index: true
        },
        declinedAt: {
            type: Date,
            index: true
        },
        rescheduledAt: {
            type: Date,
            index: true
        },
    },
    {
        timestamps: true,
    }
);

BookingSchema.index({ "location.geoAddress.location": "2dsphere" });

export const Booking = mongoose.model<IBooking>("Booking", BookingSchema);
