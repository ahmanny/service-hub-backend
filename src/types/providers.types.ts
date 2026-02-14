import { Types } from "mongoose";
import { IAvailabilityDay, IProviderProfile, Services } from "../models/provider.model";
import { ServiceType } from "./service.types";



export type ProviderProfileType = IProviderProfile & {
    _id: Types.ObjectId;
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
};


export interface ProviderListItem {
    _id: string;
    firstName: string;
    serviceType: ServiceType;
    availabilityMode: "instant" | "schedule" | "offline";
    basePrice: number;
    rating: number;
    profilePicture?: string | null;
    distance: number | null;               // in meters
    duration: number | null;               // in seconds
    isClosest: boolean;
    isTopRated: boolean;
    reviewCount: number;
}


export interface createProviderProfilePayload {
    userId: string

    firstName: string,
    lastName: string,
    email: string,

    profilePicture: string,

    bio: string,

    serviceType: string,
    services: Services[],

    shopAddress: {
        formattedAddress: string;
        latitude: number;
        longitude: number;
        city?: string;
        state?: string;
    },
    offersHomeService: boolean,
    offersShopVisit: boolean,

    serviceArea: {
        formattedAddress: string
        center: {
            latitude: number,
            longitude: number
        }
    }
    radiusKm: number,

    availability: IAvailabilityDay[],
    avgServiceTime: number,

    verification: {
        idUri: string,
        selfieUri: string,
    }
}