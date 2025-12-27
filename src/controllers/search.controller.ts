import Exception from "../exceptions/Exception";
import MissingParameterException from "../exceptions/MissingParameterException";
import UnauthorizedAccessException from "../exceptions/UnauthorizedAccessException";
import { ProviderService } from "../services/provider.service";
import { error_handler, ok_handler } from "../utils/response_handler";
import { Request, RequestHandler, Response } from "express";

export const searchNearbyProviders = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            // if (!req.currentUser) {
            //     throw new UnauthorizedAccessException("Unauthorized");
            // }
            const serviceType = String(req.query.serviceType);
            const lat = Number(req.query.lat);
            const lng = Number(req.query.lng);
            const maxDist = Number(req.query.maxDist) || 2000

            if (!serviceType || Number.isNaN(lat) || Number.isNaN(lng)) {
                throw new MissingParameterException("Some parameters are missing or invalid");
            }

            if (!serviceType || !lat || !lng) {
                throw new MissingParameterException("Some parameters are missing")
            }
            const data = await ProviderService.searchNearbyProviders({ serviceType, lat, lng, maxDist })
            ok_handler(res, "provider", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}