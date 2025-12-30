import MissingParameterException from "../../exceptions/MissingParameterException";
import UnauthorizedAccessException from "../../exceptions/UnauthorizedAccessException";
import { ConsumerService } from "../../services/consumer.service";
import { error_handler, ok_handler } from "../../utils/response_handler";
import { Request, RequestHandler, Response } from "express";

export const searchNearbyProviders = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const serviceType = String(req.query.serviceType);
            const lat = Number(req.query.lat);
            const lng = Number(req.query.lng);
            const maxDist = Number(req.query.maxDist) || 2000

            const bookingDateTime = req.query.bookingDateTime
                ? new Date(String(req.query.bookingDateTime))
                : null;

            const service = req.query.service ? String(req.query.service) : null;
            const locationType = req.query.locationType ? String(req.query.locationType) : null;

            if (!serviceType || Number.isNaN(lat) || Number.isNaN(lng) || !bookingDateTime || !service) {
                throw new MissingParameterException("Some parameters are missing or invalid");
            }


            const data = await ConsumerService.searchNearbyProviders({ serviceType, lat, lng, maxDist, bookingDateTime, locationType, service })
            ok_handler(res, "provider", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}