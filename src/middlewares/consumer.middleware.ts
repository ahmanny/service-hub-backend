import type { Request, Response, NextFunction } from 'express';
import { getConsumerTokenInfo } from '../utils';
import { error_handler } from '../utils/response_handler';
import AuthenticationTokenException from '../exceptions/AuthenticationTokenException';

export class ConsumerMiddleware {
    constructor() { }

    async validateToken(req: Request, res: Response, next: NextFunction) {
        try {
            const token = await getConsumerTokenInfo({ req });
            if (token?.is_valid_token && token.user) {
                req.consumer = token.user
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