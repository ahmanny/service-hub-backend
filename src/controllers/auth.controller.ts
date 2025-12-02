import { AuthService } from "../services/auth.service"
import express, { Request, RequestHandler, Response } from 'express';
import { created_handler, error_handler, ok_handler } from "../utils/response_handler";
import MissingParameterException from "../exceptions/MissingParameterException";


// sign up controller
export const signup = (): RequestHandler => {
    return async (req: express.Request, res: express.Response): Promise<void> => {
        try {
            const data = await AuthService.signUpFunction(req.body)
            created_handler(res, "account successfully creatd", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}



// login controller
export const loginController = (): RequestHandler => {
    return async (req: express.Request, res: express.Response): Promise<void> => {
        try {
            const data = await AuthService.loginFunction(req.body)

            ok_handler(res, "logged in successfully", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}
// login controller
export const googleLoginController = (): RequestHandler => {
    return async (req: express.Request, res: express.Response): Promise<void> => {
        try {
            const data = await AuthService.googleLoginFunction(req.body)

            ok_handler(res, "logged in successfully", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}

// logout controller
export const logoutController = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { refresh_token } = req.body
            await AuthService.logoutFunction(refresh_token)
            ok_handler(res, "Logged out successfully")
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}

// refresh user session token controller
export const refreshToken = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {

        try {
            const { refresh_token } = req.body;
            if (!refresh_token) {
                throw new MissingParameterException("Refresh token provided")
            }
            const data = await AuthService.refreshUserToken(refresh_token)

            ok_handler(res, "token refreshed", data)
        } catch (error) {
            console.error('Refresh token error:', error);
            error_handler(error, req, res)
        }
    }
}


// forgotten password function
export const forgottenPasswordController = (): RequestHandler => {
    return async (req: express.Request, res: express.Response): Promise<void> => {
        try {
            const data = await AuthService.forgottenPasswordFunction(req.body)
            ok_handler(res, "sent reset password link successfully", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}


// reset password function
export const passwordResetController = (): RequestHandler => {
    return async (req: express.Request, res: express.Response): Promise<void> => {
        try {
            const { token, newPassword } = req.body
            if (!token || !newPassword) {
                throw new MissingParameterException("Token and new password are required")
            }
            await AuthService.passwordResetFunction({ token, password: newPassword })
            ok_handler(res, "password succesfully reset")
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}