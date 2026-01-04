import { Types } from "mongoose";
import { IBooking } from "../models/booking.model";
import { GeoAddress } from "../models/schemas/geoPoint.schema";

export type BookingType = IBooking & {
    _id: string;
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
};


export interface CreateBookingPayload {
    consumerId: string;
    providerId: string;
    service: string;
    serviceName: string;
    scheduledAt: Date;
    locationType: string
    geoAddress?: GeoAddress;
    textAddress?: string;
    note?: string;
}

export interface fetchBookingsPayload {
    tab: "upcoming" | "past" | "all" | "pending";
    consumerId?: Types.ObjectId;
    providerId?: Types.ObjectId;
    page?: number;
    skip?: number;
    limit?: number;
}