import BadRequestException from "../exceptions/BadRequestException";
import UnauthorizedAccessException from "../exceptions/UnauthorizedAccessException";
import { ConsumerService } from "../services/consumer.service";
import { SearchService } from "../services/search.service";
import { SearchPayload } from "../types/consumer";
import { error_handler, ok_handler } from "../utils/response_handler";
import { Request, RequestHandler, Response } from "express";

export const discoverProviders = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const { serviceType, lat, lng } = req.query;

            if (!serviceType || !lat || !lng) {
                throw new BadRequestException("Missing required query parameters: serviceType, lat, lng");
            }

            const payload: SearchPayload = {
                serviceType: serviceType as string,
                lat: parseFloat(lat as string),
                lng: parseFloat(lng as string)
            };

            const data = await SearchService.discoverProviders(payload);

            ok_handler(res, "providers dicovery list", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}
