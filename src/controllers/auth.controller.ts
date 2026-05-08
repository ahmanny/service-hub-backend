import { Request, RequestHandler, Response } from "express"
import { error_handler, ok_handler } from "../utils/response_handler"
import { AuthService } from "../services/auth.service"
import { NotificationService } from "../services/notifications.service"
import MissingParameterException from "../exceptions/MissingParameterException"
import { AppRole } from "../utils"



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
export const verifyOtp = (role: "consumer" | "provider"): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { tokens, hasProfile, profile } = await AuthService.verifyOtp({
                ...req.body,
                appType: role
            });
            const data = { tokens, hasProfile, profile }

            // Send welcome notification
            try {
                const userId = req.body.userId || profile?.userId?._id || profile?.userId;
                if (userId) {
                    const title = role === "provider" ? "Welcome to ServiceHub Provider! 🎉" : "Welcome to ServiceHub! 🎉";
                    const body = role === "provider" 
                        ? "Your account is ready. Start accepting jobs and earning."
                        : "You're all set! Book services and manage your appointments.";
                    
                    await NotificationService.sendToUser(userId, title, role, body, {
                        type: "welcome",
                        screen: "Home"
                    });
                }
            } catch (notifyErr) {
                console.error("Welcome notification error (non-blocking):", notifyErr);
            }

            ok_handler(res, "OTP Verified", data);
        } catch (error) {
            error_handler(error, req, res);
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


// refresh session 
export const refreshSession = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { refresh_token } = req.body
            if (!refresh_token) {
                throw new MissingParameterException("Session Refresh Token Needed")
            }
            const data = await AuthService.refreshUserSession(refresh_token)
            ok_handler(res, "Session Refreshed", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}

export const authenticationLogin = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                throw new MissingParameterException("Email and password are required");
            }
            const { tokens, user } = await AuthService.loginAdmin({ email, password });
            ok_handler(res, "Admin login successful", { tokens, user });
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const refreshAuthenticationToken = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { refresh_token } = req.body;
            if (!refresh_token) {
                throw new MissingParameterException("Session Refresh Token Needed");
            }
            const data = await AuthService.refreshUserSession(refresh_token);
            ok_handler(res, "Session Refreshed", data);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}


// log out 
export const logout = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { refresh_token } = req.body
            await AuthService.logout(refresh_token)
            ok_handler(res, "Logged out successfully")
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}
