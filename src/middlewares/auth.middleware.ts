import type { Request, Response, NextFunction } from 'express';
import { getUserTokenInfo } from '../utils';
import { error_handler } from '../utils/response_handler';
import AuthenticationTokenException from '../exceptions/AuthenticationTokenException';
import UnauthorizedAccessException from '../exceptions/UnauthorizedAccessException';
import { getConsumerByUserId } from '../models/consumer.model';
import { Provider } from '../models/provider.model';

declare global {
    namespace Express {
        interface Request {
            adminRole?: 'super-admin' | 'support' | 'finance';
        }
    }
}

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
            
            if (token.user.adminRole) {
                req.adminRole = token.user.adminRole;
            }

            next(); // Proceed to next
        } catch (error) {
            error_handler(error, req, res)
        }
    }

    public authorizeRole(roles: 'consumer' | 'provider' | 'admin' | Array<'consumer' | 'provider' | 'admin'>) {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                if (!req.currentUser || !req.appType) {
                    throw new AuthenticationTokenException("Unauthorized");
                }

                // Convert to array if it's a single string for uniform checking
                const allowedRoles = Array.isArray(roles) ? roles : [roles];

                // 1. Check if the user's appType is in the allowed list
                if (!allowedRoles.includes(req.appType as any)) {
                    throw new UnauthorizedAccessException(
                        `Access denied. Requires one of these roles: ${allowedRoles.join(', ')}`
                    );
                }

                // 2. Attach the specific profile based on the CURRENT appType
                // This is cleaner because we only fetch what is actually being used
                if (req.appType === 'consumer') {
                    const profile = await getConsumerByUserId(req.currentUser._id);
                    if (!profile) throw new UnauthorizedAccessException("Consumer profile not found");
                    req.consumerProfile = profile;
                }

                if (req.appType === 'provider') {
                    const profile = await Provider.findOne({ userId: req.currentUser._id });
                    if (!profile) throw new UnauthorizedAccessException("Provider profile not found");
                    req.providerProfile = profile;
                }

                next();
            } catch (error) {
                error_handler(error, req, res);
            }
        };
    }
}