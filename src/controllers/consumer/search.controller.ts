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
            const data = await ConsumerService.searchNearbyProviders({ serviceType, lat, lng, maxDist })

            ok_handler(res, "provider", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}
export const getProviders = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const serviceType = String(req.query.serviceType);
            const lat = Number(req.query.lat);
            const lng = Number(req.query.lng);
            const maxDist = Number(req.query.maxDist) || 2000
            const data = await ConsumerService.searchNearbyProviders({ serviceType, lat, lng, maxDist })

            ok_handler(res, "provider", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}