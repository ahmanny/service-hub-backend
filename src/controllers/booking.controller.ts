import { Request, RequestHandler, Response } from "express";
import UnauthorizedAccessException from "../exceptions/UnauthorizedAccessException";
import { BookingService } from "../services/booking.service";
import { error_handler, ok_handler } from "../utils/response_handler";
import MissingParameterException from "../exceptions/MissingParameterException";
import { NotificationService } from "../services/notifications.service";

/**
 * Creates a new booking request.
 * Restricted to: Consumer only.
 */
export const bookProvider = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.consumerProfile) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const data = await BookingService.createBooking({ consumerId: req.consumerProfile._id, ...req.body })


            const consumerName = `${req.consumerProfile.firstName} ${req.consumerProfile.lastName}`;
            const serviceRequested = data.serviceName;

            NotificationService.sendByProfile(
                'provider',
                data.providerId.toString(),
                "New Booking Request! 📅",
                `${consumerName} wants to book you for ${serviceRequested}.`,
                {
                    bookingId: data.bookingId.toString(),
                    type: "NEW_BOOKING",
                    screen: "BookingDetails"
                }
            ).catch(err => console.error("Notification Error:", err));


            ok_handler(res, "Request Sent", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}

/**
 * Retrieves a list of bookings filtered by status tabs (pending, upcoming, past).
 * Supports: Consumer and Provider 
 * Optional: lat/lng query params for distance calculation.
 */
export const getBookings = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const consumerId = req.consumerProfile?._id;
            const providerId = req.providerProfile?._id;

            if (!consumerId && !providerId) {
                throw new UnauthorizedAccessException("No profile context found");
            }

            const tab = (req.query.tab as string) || "all";

            const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
            const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

            const data = await BookingService.fetchBookings({
                consumerId,
                providerId,
                tab: tab as any,
                lat,
                lng
            });

            ok_handler(res, "Bookings retrieved successfully", data);
        } catch (error) {
            
            error_handler(error, req, res);
        }
    };
};

/**
 * Retrieves full details for a specific booking.
 * Supports: Consumer and Provider.
 * Validates: Ensures the requester is part of the booking.
 */
export const getBookingDetails = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const consumerId = req.consumerProfile?._id;
            const providerId = req.providerProfile?._id;

            if (!consumerId && !providerId) {
                throw new UnauthorizedAccessException("No profile context found");
            }

            const { bookingId } = req.params
            if (!bookingId) {
                throw new MissingParameterException("provider Id is missing")
            }
            const data = await BookingService.fetchBookingsDetails({
                bookingId,
                currentUserId: consumerId?.toString() || providerId?.toString(),
            })
            ok_handler(res, "successfull", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}

/**
 * Processes status updates for a booking (Accept, Decline, Cancel, Reschedule,start,complete).
 * Supports: Consumer (Cancel/Reschedule) and Provider (Accept/Decline,start,complete).
 */
export const handleBookingAction = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { bookingId } = req.params;
            const { action, reason, newScheduledAt, disputeReason, rating, comment } = req.body;

            const actorProfile = req.providerProfile || req.consumerProfile;
            if (!actorProfile) throw new UnauthorizedAccessException("Identity not found");

            // All logic, including notifications, happens inside the service
            const data = await BookingService.updateBookingStatus({
                bookingId,
                action,
                reason,
                rating,
                comment,
                newScheduledAt,
                disputeReason,
                userId: actorProfile._id.toString(),
            });

            const messages = {
                accept: "Booking accepted successfully",
                decline: "Booking declined",
                cancel: "Booking cancelled successfully",
                reschedule: "Reschedule request sent",
                start: "Job started",
                complete: "Job marked as complete",
                dispute: "Dispute raised successfully"
            };

            ok_handler(res, messages[action as keyof typeof messages] || "Success", data);
        } catch (error) {
            error_handler(error, req, res);
        }
    };
};
/**
 * Retrieves provider availability and schedule specifically for rescheduling purposes.
 * Restricted to: Consumer (looking to change an existing booking).
 */
export const getRescheduleSchedule = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            
            const { bookingId } = req.params;
            const userId = req.consumerProfile?._id;

            if (!userId) throw new UnauthorizedAccessException("Consumer profile not found");
            if (!bookingId) {
                throw new MissingParameterException("Booking ID is required");
            }

            const data = await BookingService.getRescheduleData(bookingId, userId.toString());

            ok_handler(res, "Provider schedule retrieved", data);
        } catch (error) {
            
            error_handler(error, req, res);
        }
    };
};