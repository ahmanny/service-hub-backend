import { Request, RequestHandler, Response } from "express"
import { error_handler, ok_handler } from "../utils/response_handler"
import { AuthService } from "../services/auth.service"
import MissingParameterException from "../exceptions/MissingParameterException"
import { AppRole } from "../utils"
import Exception from "../exceptions/Exception"
import { User } from "../models/user.model"


export const savePushToken = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { pushToken } = req.body;
            const userId = req.currentUser?._id;

            if (!pushToken) {
                throw new Exception("Push token is required")
            }

            // Add token to the array only if it doesn't exist
            await User.findByIdAndUpdate(userId, {
                $addToSet: { pushTokens: pushToken },
            });

            ok_handler(res, "Push token saved successfully", {});
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}