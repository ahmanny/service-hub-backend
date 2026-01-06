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

    location: {
        type: "home" | "shop";
        geoAddress?: GeoAddress;
        textAddress?: string | IProviderShopAddress;
    }

    note?: string;

    status: "pending" | "accepted" | "declined" | "completed" | "cancelled";
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

        status: {
            type: String,
            enum: ["pending", "confirmed", "completed", "cancelled"],
            default: "pending",
            index: true,
        },
    },
    {
        timestamps: true,
    }
);


export const Booking = mongoose.model<IBooking>("Booking", BookingSchema);
