import { IConsumer } from "../../models/consumer.model";

export type ConsumerType = IConsumer & {
    _id: string;
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
};