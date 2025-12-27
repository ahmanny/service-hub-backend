import type { Request, Response, NextFunction } from 'express';
import { getUserTokenInfo } from '../utils';
import { error_handler } from '../utils/response_handler';
import AuthenticationTokenException from '../exceptions/AuthenticationTokenException';

export class AuthMiddleware {
    constructor() { }

    async validateToken(req: Request, res: Response, next: NextFunction) {
        try {
            const token = await getUserTokenInfo({ req });
            if (token?.is_valid_token && token.user) {
                console.log(token.user);
                req.currentUser = token.user
                console.log(req.currentUser);
            }

            if (!token?.is_valid_token) {
                throw new AuthenticationTokenException("Invalid or Expired authentication token")
            }
            next(); // Proceed to next
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}