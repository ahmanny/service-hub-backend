import { HydratedDocument } from "mongoose";
import { IConsumerProfile } from "../models/consumer.model";


export function sanitizeUser(user: HydratedDocument<IConsumerProfile> | any) {
    // Convert to plain JS object if it's a Mongoose document
    const plainUser = typeof user.toObject === "function" ? user.toObject() : user;

    const {
        password,
        __v,
        ...safeUser
    } = plainUser;

    return safeUser;
}

export function getFullName(user: Pick<IConsumerProfile, "firstName" | "lastName">): string {
    return `${user.firstName} ${user.lastName}`.trim();
}