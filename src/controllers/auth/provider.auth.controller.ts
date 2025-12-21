import MissingParameterException from "../../exceptions/MissingParameterException"
import { ProviderAuthService } from "../../services/auth/provider.auth.service"
import { created_handler, error_handler, ok_handler } from "../../utils/response_handler"
import express, { RequestHandler } from "express"



// sign up controller
export const signup = (): RequestHandler => {
    return async (req: express.Request, res: express.Response): Promise<void> => {
        try {
            const data = await ProviderAuthService.signUpFunction(req.body)
            created_handler(res, "account successfully created", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}

// login controller
export const loginController = (): RequestHandler => {
    return async (req: express.Request, res: express.Response): Promise<void> => {
        try {
            const data = await ProviderAuthService.loginFunction(req.body)

            ok_handler(res, "logged in successfully", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}

// login with google
export const googleLoginController = (): RequestHandler => {
    return async (req: express.Request, res: express.Response): Promise<void> => {
        try {
            const data = await ProviderAuthService.googleLoginFunction(req.body)

            ok_handler(res, "logged in successfully", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}

// logout controller
export const logoutController = (): RequestHandler => {
    return async (req: express.Request, res: express.Response): Promise<void> => {
        try {
            const { refresh_token } = req.body
            await ProviderAuthService.logoutFunction(refresh_token)
            ok_handler(res, "Logged out successfully")
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}

// refresh user session token controller
export const refreshToken = (): RequestHandler => {
    return async (req: express.Request, res: express.Response): Promise<void> => {

        try {
            const { refresh_token } = req.body;
            if (!refresh_token) {
                throw new MissingParameterException("Refresh token provided")
            }
            const data = await ProviderAuthService.refreshUserToken(refresh_token)

            ok_handler(res, "token refreshed", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}

// forgotten password function
export const forgottenPasswordController = (): RequestHandler => {
    return async (req: express.Request, res: express.Response): Promise<void> => {
        try {
            const data = await ProviderAuthService.forgottenPasswordFunction(req.body)
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
            await ProviderAuthService.passwordResetFunction({ token, password: newPassword })
            ok_handler(res, "password succesfully reset")
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}