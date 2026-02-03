import { Request, RequestHandler, Response } from "express";
import { error_handler, ok_handler } from "../../utils/response_handler";
import UnauthorizedAccessException from "../../exceptions/UnauthorizedAccessException";
import { EarningsService } from "../../services/provider/earnings.service";

export const getEarningsDashboard = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.providerProfile) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const providerId = req.providerProfile._id;
            const data = await EarningsService.getProviderEarnings(providerId.toString());

            return ok_handler(res, "Earnings fetched successfully", data);
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}