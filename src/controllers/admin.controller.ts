import { Request, RequestHandler, Response } from "express";
import UnauthorizedAccessException from "../exceptions/UnauthorizedAccessException";
import { error_handler, ok_handler } from "../utils/response_handler";

// refresh user session token controller
export const getAdminDashboardStats = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.consumer) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
        } catch (error) {
            console.error('Refresh token error:', error);
            error_handler(error, req, res)
        }
    }
}