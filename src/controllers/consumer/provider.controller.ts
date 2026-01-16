import MissingParameterException from "../../exceptions/MissingParameterException";
import UnauthorizedAccessException from "../../exceptions/UnauthorizedAccessException";
import { AuthService } from "../../services/auth.service";
import { ConsumerService } from "../../services/consumer.service";
import { error_handler, ok_handler } from "../../utils/response_handler";
import { Request, RequestHandler, Response } from "express";




// verify login/sign up otp controller for consummer
export const verifyOtp = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { tokens, hasProfile, profile } = await AuthService.verifyOtp({
                phone: req.body.phone,
                otp: req.body.otp,
                appType: "provider"
            });
            const data = { tokens, hasProfile, profile }
            ok_handler(res, "otp Verified", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}