import mongoose, { Schema, Types, model } from "mongoose";
import { GeoAddress, GeoPointSchema } from "./schemas/geoPoint.schema";

export interface Services {
    name: string;
    value: string;
    price: number;
}

export interface IProviderShopAddress {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
}

export interface IProviderProfile {
    userId: Types.ObjectId;

    firstName?: string;
    lastName?: string;
    profilePicture?: string;

    isAvailable: boolean;
    availabilityMode: "instant" | "scheduled";

    serviceType:
    | "barber"
    | "hair_stylist"
    | "electrician"
    | "plumber"
    | "house_cleaning";

    basePriceFrom: number;
    homeServiceAvailable: boolean;
    services: Services[];

    rating: number;
    isVerified: boolean;

    shopAddress?: IProviderShopAddress;

    location?: GeoAddress
}

const ProviderShopAddressSchema = new Schema<IProviderShopAddress>(
    {
        address: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
    },
    { _id: false }
);

const ServiceSchema = new Schema<Services>(
    {
        name: { type: String, required: true },
        value: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);


const ProviderSchema = new Schema<IProviderProfile>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            // ref: "User",
            required: true,
            unique: true, // one provider profile per user
            index: true,
        },

        firstName: { type: String, trim: true },
        lastName: { type: String, trim: true },

        profilePicture: { type: String },

        isAvailable: {
            type: Boolean,
            default: true,
            index: true,
        },

        availabilityMode: {
            type: String,
            enum: ["instant", "scheduled"],
            default: "scheduled",
            required: true,
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

        basePriceFrom: {
            type: Number,
            required: true,
            min: 0,
        },

        services: {
            type: [ServiceSchema],
            default: [],
        },

        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },

        isVerified: {
            type: Boolean,
            default: false,
            index: true,
        },
        homeServiceAvailable: {
            type: Boolean,
            default: false,
        },

        shopAddress: ProviderShopAddressSchema,

        location: GeoPointSchema
    },
    {
        timestamps: true,
    }
);

// Geo queries
ProviderSchema.index({ location: "2dsphere" });

// Common search patterns
ProviderSchema.index({ serviceType: 1, isAvailable: 1, "services.value": 1, });
ProviderSchema.index({ rating: -1 });

ProviderSchema.virtual("fullName").get(function () {
    return `${this.firstName ?? ""} ${this.lastName ?? ""}`.trim();
});


export const Provider = model<IProviderProfile>(
    "Provider",
    ProviderSchema
);