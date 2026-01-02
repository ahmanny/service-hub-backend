import { Types } from "mongoose";
import { IConsumerProfile } from "../../models/consumer.model";
import { IProviderShopAddress, Services } from "../../models/provider.model";

export type ConsumerType = IConsumerProfile & {
    _id: Types.ObjectId;
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

