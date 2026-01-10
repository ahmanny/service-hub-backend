import mongoose, { Schema, Types, model } from "mongoose";
import { GeoAddress, GeoPointSchema } from "./schemas/geoPoint.schema";
import { ServiceType } from "../types/service.types";

export interface Services {
    name: string;
    value: string;
    price: number;
}

export interface IProviderShopAddress {
    address: string;
    city?: string;
    state?: string;
    location: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
    };
}

//  Availability Interface 
export interface IAvailabilityDay {
    dayOfWeek: number; // 0 (Sunday) to 6 (Saturday)
    slots: { start: string; end: string }[]; //  { start: "09:00", end: "17:00" }
    isClosed: boolean;
}

export interface IProviderProfile {
    userId: Types.ObjectId;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
    isAvailable: boolean;
    availabilityMode: "instant" | "scheduled";
    serviceType: ServiceType;
    basePriceFrom: number;
    homeServiceAvailable: boolean;
    services: Services[];
    rating: number;
    isVerified: boolean;
    shopAddress?: IProviderShopAddress;
    availability: IAvailabilityDay[];
}

//  Schemas 

const ProviderShopAddressSchema = new Schema<IProviderShopAddress>(
    {
        address: { type: String, required: true },
        city: String,
        state: String,
        location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], required: true } // [long, lat]
        }
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

const AvailabilitySchema = new Schema<IAvailabilityDay>(
    {
        dayOfWeek: { type: Number, required: true }, // 0-6
        slots: [{
            start: String,
            end: String
        }],
        isClosed: { type: Boolean, default: false }
    },
    { _id: false }
);

const ProviderSchema = new Schema<IProviderProfile>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            unique: true,
            index: true,
        },
        firstName: { type: String, trim: true },
        lastName: { type: String, trim: true },
        profilePicture: { type: String },
        isAvailable: { type: Boolean, default: true, index: true },
        availabilityMode: {
            type: String,
            enum: ["instant", "scheduled"],
            default: "scheduled",
            required: true,
        },
        serviceType: {
            type: String,
            required: true,
            index: true,
        },
        basePriceFrom: { type: Number, required: true, min: 0 },
        services: { type: [ServiceSchema], default: [] },
        rating: { type: Number, default: 0, min: 0, max: 5 },
        isVerified: { type: Boolean, default: false, index: true },
        homeServiceAvailable: { type: Boolean, default: false },
        shopAddress: ProviderShopAddressSchema,
        availability: { type: [AvailabilitySchema], default: [] }
    },
    { timestamps: true }
);

// Indexes
ProviderSchema.index({ "shopAddress.location": "2dsphere" });
ProviderSchema.index({ serviceType: 1, isAvailable: 1 });

export const Provider = model<IProviderProfile>("Provider", ProviderSchema);