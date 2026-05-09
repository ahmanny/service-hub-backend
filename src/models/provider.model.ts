import { Schema, Types, model, Document } from "mongoose";
import { ServiceType } from "../types/service.types";

// Types
export type ProfileStatus = 'pending' | 'approved' | 'rejected';

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

export interface IAvailabilityDay {
    dayOfWeek: number;
    slots: { start: string; end: string }[];
    isClosed: boolean;
}

export interface IPayoutDetails {
    bankCode: string;
    bankName: string;
    bankSlug: string;
    accountNumber: string;
    accountName: string;
    verifiedAt?: Date;
}

// Interface
export interface IProviderProfile extends Document {
    userId: Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture?: string;
    bio?: string;

    isAvailable: boolean;
    availabilityMode: "instant" | "scheduled";
    serviceType: ServiceType;
    basePriceFrom: number;
    services: Services[];

    homeServiceAvailable: boolean;
    offersShopVisit: boolean;
    serviceArea?: {
        address: string;
        location: {
            type: 'Point';
            coordinates: [number, number];
        };
        radiusKm: number;
    };

    rating: number;
    totalStars: number;      // Sum of all stars received
    reviewCount: number;     // Number of actual ratings given
    weightedRating: number;

    status: ProfileStatus
    verification?: {
        idUri: string;
        selfieUri: string;
    };

    avgServiceTime: number;
    shopAddress?: IProviderShopAddress;
    availability: IAvailabilityDay[];

    payoutDetails?: IPayoutDetails;
    paystackRecipientCode?: string;
}

// Schemas
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

const PayoutDetailsSchema = new Schema<IPayoutDetails>(
    {
        bankCode: { type: String, required: true },
        bankName: { type: String, required: true },
        bankSlug: { type: String, required: true },
        accountNumber: { type: String, required: true, trim: true },
        accountName: { type: String, required: true, uppercase: true },
        verifiedAt: { type: Date, default: Date.now }
    },
    { _id: false }
);

const ProviderSchema = new Schema<IProviderProfile>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        profilePicture: { type: String },
        bio: {
            type: String,
            trim: true,
            default: "",
            maxlength: [250, "Bio cannot exceed 250 characters"],
        },

        isAvailable: { type: Boolean, default: true, index: true },
        availabilityMode: {
            type: String,
            enum: ["instant", "scheduled"],
            default: "scheduled",
            required: true,
        },
        serviceType: { type: String, required: true, index: true },
        basePriceFrom: { type: Number, required: true, min: 0 },
        services: { type: [ServiceSchema], default: [] },

        homeServiceAvailable: { type: Boolean, default: false },
        offersShopVisit: { type: Boolean, default: true },

        // Geospatial Service Area
        serviceArea: {
            address: String,
            location: {
                type: { type: String, enum: ['Point'], default: 'Point' },
                coordinates: [Number] // [long, lat]
            },
            radiusKm: { type: Number, default: 5 }
        },

        rating: { type: Number, default: 0, min: 0, max: 5 },
        totalStars: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 },
        weightedRating: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
            index: true
        },
        verification: {
            idUri: String,
            selfieUri: String,
        },

        avgServiceTime: { type: Number, default: 60 }, // Default 60 mins
        shopAddress: ProviderShopAddressSchema,
        availability: [{
            dayOfWeek: Number,
            slots: [{ start: String, end: String }],
            isClosed: { type: Boolean, default: false }
        }],

        payoutDetails: {
            type: PayoutDetailsSchema,
            default: null
        },
        paystackRecipientCode: { type: String, default: null }
    },
    { timestamps: true }
);

// Indexes
ProviderSchema.index({ "shopAddress.location": "2dsphere" });
ProviderSchema.index({ "serviceArea.location": "2dsphere" });
ProviderSchema.index({ serviceType: 1, isAvailable: 1, status: 1 });

export const Provider = model<IProviderProfile>("Provider", ProviderSchema);

export const getProviders = () => Provider.find();
export const getProviderById = (id: string) => Provider.findById(id);
export const updateProviderById = (id: string, values: Partial<IProviderProfile>) =>
    Provider.findByIdAndUpdate(id, values, { new: true, runValidators: true });