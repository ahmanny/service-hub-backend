import MissingParameterException from "../../exceptions/MissingParameterException";
import UnauthorizedAccessException from "../../exceptions/UnauthorizedAccessException";
import { AuthService } from "../../services/auth.service";
import { ConsumerService } from "../../services/consumer.service";
import { ProviderService } from "../../services/provider.service";
import { error_handler, ok_handler } from "../../utils/response_handler";
import { Request, RequestHandler, Response } from "express";


// get logged in consumer profile
export const getProfile = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const data = await ProviderService.fetchProfile(req.currentUser._id)
            ok_handler(res, "Completed", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}
