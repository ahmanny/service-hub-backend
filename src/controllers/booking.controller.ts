import { Request, RequestHandler, Response } from "express";
import UnauthorizedAccessException from "../exceptions/UnauthorizedAccessException";
import { BookingService } from "../services/booking.service";
import { error_handler, ok_handler } from "../utils/response_handler";




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