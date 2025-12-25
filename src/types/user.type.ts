import { IUser } from "../models/user.model";

export type userType = IUser & {
    _id: string;
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
};