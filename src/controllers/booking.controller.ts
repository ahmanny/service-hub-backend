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