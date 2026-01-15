import { Request, RequestHandler, Response } from "express";
import UnauthorizedAccessException from "../exceptions/UnauthorizedAccessException";
import { BookingService } from "../services/booking.service";
import { error_handler, ok_handler } from "../utils/response_handler";
import MissingParameterException from "../exceptions/MissingParameterException";




// book a provider for a service 
export const bookProvider = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.consumerProfile) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const data = await BookingService.createBooking({ consumerId: req.consumerProfile._id, ...req.body })
            ok_handler(res, "Request Sent", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}

// get bookings for consumer 
export const getConsumerBookings = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.consumerProfile) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            // 1. Cast query strings to actual numbers
            const tab = (req.query.tab as string) || "all";
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const data = await BookingService.fetchBookings({
                consumerId: req.consumerProfile._id,
                tab: tab as any,
                page,
                limit,
            });

            ok_handler(res, "Bookings retrieved successfully", data);
        } catch (error) {
            error_handler(error, req, res);
        }
    };
};

// get a booking details
export const getBookingDetails = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.consumerProfile) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const { bookingId } = req.params
            if (!bookingId) {
                throw new MissingParameterException("provider Id is missing")
            }
            const data = await BookingService.fetchBookingsDetails({
                bookingId,
                currentUserId: req.consumerProfile._id.toString(),
                role: "consumer"
            })
            ok_handler(res, "successfull", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}

export const handleBookingAction = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            console.log("am here to perform an action")
            const { bookingId } = req.params;
            const { action, reason, newScheduledAt } = req.body;

            // Identify who is calling based on your middleware
            const userId = req.consumerProfile?._id || req.providerProfile?._id;

            if (!userId) {
                throw new UnauthorizedAccessException("Identity not found");
            }

            if (!bookingId) {
                throw new MissingParameterException("Booking ID is required");
            }

            const data = await BookingService.updateBookingStatus({
                bookingId,
                action,
                reason,
                newScheduledAt,
                userId: userId.toString(),
            });

            // Dynamic message based on action
            const messages = {
                accept: "Booking accepted successfully",
                decline: "Booking declined",
                cancel: "Booking cancelled successfully",
                reschedule: "Reschedule request sent",
            };

            ok_handler(res, messages[action as keyof typeof messages] || "Success", data);
        } catch (error) {
            error_handler(error, req, res);
        }
    };
};

export const getRescheduleSchedule = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            console.log("am here so get me reschedule data")
            const { bookingId } = req.params;
            const userId = req.consumerProfile?._id;

            if (!userId) throw new UnauthorizedAccessException("Consumer profile not found");
            if (!bookingId) {
                throw new MissingParameterException("Booking ID is required");
            }

            const data = await BookingService.getRescheduleData(bookingId, userId.toString());

            ok_handler(res, "Provider schedule retrieved", data);
        } catch (error) {
            console.log(error)
            error_handler(error, req, res);
        }
    };
};


// get bookings for Provider
// export const getProviderBookings = (): RequestHandler => {
//     return async (req: Request, res: Response): Promise<void> => {
//         try {
//             if (!req.providerProfile) {
//                 throw new UnauthorizedAccessException("Unauthorized");
//             }
//             const data = await BookingService.fetchBookings({ providerId: req.providerProfile._id, ...req.query })
//             ok_handler(res, "Request Sent", data)
//         } catch (error) {
//             error_handler(error, req, res)
//         }
//     }
// }