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
    lng?: any
    lat?: any
}

export enum BookingStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    DECLINED = 'declined',
    IN_PROGRESS = 'in_progress',
    COMPLETION_PENDING = 'completion_pending', // The 2-hour escrow window
    COMPLETED = 'completed',
    DISPUTED = 'disputed',
    CANCELLED = 'cancelled',
    EXPIRED = 'expired',
    CANCELLED_REFUNDED = 'cancelled_refunded',
}

export enum PaymentStatus {
    PENDING = 'pending',
    AUTHORIZED = 'authorized', // For card holds
    HELD = 'held',             // Money in escrow
    RELEASED = 'released',     // Paid to provider
    REFUNDED = 'refunded',
    FAILED = 'failed',
}

export enum PayoutStatus {
    PENDING = 'pending',    // Waiting for completion window
    FROZEN = 'frozen',     // Under dispute
    AVAILABLE = 'available', // Ready for provider to withdraw
    PROCESSING = 'processing',
    COMPLETED = 'completed',
}

export enum FinancialStatus {
    ESCROW_HELD = 'escrow_held',
    PENDING_EARNING = 'pending_earning',
    AVAILABLE = 'available',
    DISPUTED = 'disputed',
    RELEASED = 'released',
    REFUNDED = 'refunded',
}

export enum LedgerEntryType {
    CREDIT_ESCROW = 'credit_escrow',
    CREDIT_PENDING = 'credit_pending',
    MOVE_PENDING_TO_AVAILABLE = 'move_pending_to_available',
    RELEASE_TO_PROVIDER = 'release_to_provider',
    DISPUTE_HOLD = 'dispute_hold',
    REFUND = 'refund',
}

export enum DisputeReason {
    NO_SHOW = 'no_show',
    POOR_QUALITY = 'poor_quality',
    INCOMPLETE = 'incomplete',
    DAMAGED_PROPERTY = 'damaged_property',
    OTHER = 'other',
}

export enum DisputeResolution {
    PENDING = 'pending',
    REJECTED = 'rejected',           // Provider gets paid
    FULL_REFUND = 'full_refund',     // Consumer gets money back
    PARTIAL_REFUND = 'partial_refund',
}
