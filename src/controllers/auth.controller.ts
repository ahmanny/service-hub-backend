import { Request, RequestHandler, Response } from "express"
import { error_handler, ok_handler } from "../utils/response_handler"
import { AuthService } from "../services/auth.service"



// send login/sign up otp controller
export const sendOtp = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await AuthService.sendOtpFunction(req.body)
            ok_handler(res, "otp sent", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}
// verify login/sign up otp controller
export const verifyOtp = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await AuthService.verifyOtp(req.body)
            ok_handler(res, "otp Verified", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}
// resend controller
export const resendOtp = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await AuthService.resendOtp(req.body)
            ok_handler(res, "otp Resent", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}
// resend controller
export const getOtpCooldown = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await AuthService.getCooldown(req.body)
            ok_handler(res, "otp cooldown", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}
