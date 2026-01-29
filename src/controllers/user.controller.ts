import { Request, RequestHandler, Response } from "express"
import { error_handler, ok_handler } from "../utils/response_handler"
import MissingParameterException from "../exceptions/MissingParameterException"
import { AppRole } from "../utils"
import { User } from "../models/user.model"
import UnauthorizedAccessException from "../exceptions/UnauthorizedAccessException"


export const savePushToken = (role: AppRole): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { pushToken } = req.body;
            const userId = req.currentUser?._id;

            if (!pushToken) {
                throw new MissingParameterException("Push token is required");
            }

            if (!userId) {
                throw new UnauthorizedAccessException("Identity not found");
            }

            // The role is now "baked in" from the route definition
            const tokenField = role === 'provider' ? 'providerPushTokens' : 'consumerPushTokens';

            await User.findByIdAndUpdate(userId, {
                $addToSet: { [tokenField]: pushToken },
            });

            ok_handler(res, `Push token saved for ${role} successfully`, {});
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}