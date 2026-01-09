import { ServiceType } from "./service.types";

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
}