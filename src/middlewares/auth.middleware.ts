import type { Request, Response, NextFunction } from 'express';
import { getUserTokenInfo } from '../utils';
import { error_handler } from '../utils/response_handler';
import AuthenticationTokenException from '../exceptions/AuthenticationTokenException';
import UnauthorizedAccessException from '../exceptions/UnauthorizedAccessException';
import { getConsumerByUserId } from '../models/consumer.model';
import { Provider } from '../models/provider.model';

export class AuthMiddleware {
    constructor() { }

    async validateToken(req: Request, res: Response, next: NextFunction) {
        try {
            const token = await getUserTokenInfo({ req });
            if (!token?.is_valid_token || !token.user || !token.appType) {
                throw new AuthenticationTokenException("Invalid or Expired authentication token")
            }
            req.currentUser = token.user;
            req.appType = token.appType;

            next(); // Proceed to next
        } catch (error) {
            error_handler(error, req, res)
        }
    }

    //  Role Authorization
    public authorizeRole(requiredRole: 'consumer' | 'provider') {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {

                if (!req.currentUser || !req.appType) {
                    throw new AuthenticationTokenException("Unauthorized");
                }

                if (req.appType !== requiredRole) {
                    throw new UnauthorizedAccessException(`Access denied. This is a ${requiredRole} only route.`);
                }

                // Attach the specific profile for convenience in controllers
                if (requiredRole === 'consumer') {
                    const profile = await getConsumerByUserId(req.currentUser._id);
                    if (!profile) {
                        throw new UnauthorizedAccessException("Access denied. You dont have an active profile")
                    }
                    req.consumerProfile = profile;
                }
                if (requiredRole === 'provider') {
                    const profile = await Provider.findOne({ userId: req.currentUser._id });
                    req.providerProfile = profile;
                }

                next();
            } catch (error) {
                error_handler(error, req, res);
            }
        };
    }
}