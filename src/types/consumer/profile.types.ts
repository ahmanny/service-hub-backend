import { IConsumerProfile } from "../../models/consumer.model";
import { IProviderShopAddress, Services } from "../../models/provider.model";

export type ConsumerType = IConsumerProfile & {
    _id: string;
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
};


export interface CreateProfilePayload {
    userId: string;
    email?: string;
    firstName: string;
    lastName: string;
}


export interface IProviderBookingProfile {
    firstName: string;
    profilePicture?: string;

    availabilityMode: "instant" | "scheduled";
    homeServiceAvailable: boolean;

    services: Services[];
    rating: number;

    shopAddress?: IProviderShopAddress;
}
