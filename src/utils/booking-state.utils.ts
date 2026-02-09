import { BookingStatus } from "../types/booking.types";

export const BOOKING_STATUS_FLOW: Record<BookingStatus, BookingStatus[]> = {
    [BookingStatus.PENDING]: [
        BookingStatus.ACCEPTED,
        BookingStatus.DECLINED, // Provider rejects the request
        BookingStatus.CANCELLED, // User cancels before acceptance
        BookingStatus.EXPIRED    // No one acted before the deadline
    ],
    [BookingStatus.ACCEPTED]: [
        BookingStatus.IN_PROGRESS,
        BookingStatus.CANCELLED    // Cancellation after acceptance (may involve fees)
    ],
    [BookingStatus.IN_PROGRESS]: [
        BookingStatus.COMPLETION_PENDING,
        BookingStatus.CANCELLED    // Cancellation during the job (emergency/dispute)
    ],
    [BookingStatus.COMPLETION_PENDING]: [
        BookingStatus.COMPLETED,
        BookingStatus.DISPUTED
    ],
    [BookingStatus.DISPUTED]: [
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED_REFUNDED
    ],
    // Final/Terminal States (No further transitions allowed)
    [BookingStatus.COMPLETED]: [],
    [BookingStatus.DECLINED]: [],
    [BookingStatus.EXPIRED]: [],
    [BookingStatus.CANCELLED]: [],
    [BookingStatus.CANCELLED_REFUNDED]: [],
};

export function canTransitionTo(from: BookingStatus, to: BookingStatus): boolean {
    return BOOKING_STATUS_FLOW[from]?.includes(to) ?? false;
}