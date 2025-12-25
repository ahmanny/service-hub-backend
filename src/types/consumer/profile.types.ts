import { IConsumerProfile } from "../../models/consumer.model";

export type ConsumerType = IConsumerProfile & {
    _id: string;
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
};