import type { Request } from 'express';
import { RefreshToken } from '../models/refresh-token.model';
import { JwtService } from '../services/jwt.service';
import { ConsumerType } from '../types/consumer/profile.types';
import { getConsumerById } from '../models/consumer.model';
import { userType } from '../types/user.type';
import { getUserById } from '../models/user.model';

export type AppRole = 'consumer' | 'provider';

type TGetUserTokenInfoArgs = {
    req?: Request,
    token?: string,
    token_type?: 'access' | 'refresh',
}

export const getUserTokenInfo = async ({ req, token, token_type }: TGetUserTokenInfoArgs) => {
    if (!req && !token) return { token: null, is_valid_token: false, user: null, appType: null };

    try {
        const _token = token ?? req?.headers.authorization?.split(' ')[1];

        if (!_token) return { token: null, is_valid_token: false, user: null, appType: null };

        const decoded = JwtService.verify(_token, (token_type || 'access'));
        const is_valid_token = !!decoded;

        let user: any = null;
        let appType: AppRole | null = null;

        if (is_valid_token && decoded) {
            // The payload now contains appType
            const payload = decoded as { id: string, appType: AppRole };
            appType = payload.appType;
            
            const acct = await getUserById(payload.id).lean();
            if (acct) {
                user = { ...acct, _id: acct._id.toString() };
            }
        }

        return {
            token: _token,
            is_valid_token,
            user,
            appType, // Now you know which app this token belongs to
        };
    } catch (error) {
        console.error("Token Info Error:", error);
        return { token: null, is_valid_token: false, user: null, appType: null };
    }
};

export const generateTokens = async (user: any, appType: AppRole) => {
    try {
        const payload = {
            id: user._id,
            appType: appType, // Crucial: Embed the role in the token
        };

        const access_token = JwtService.sign(payload, 'access');
        const refresh_token = JwtService.sign(payload, 'refresh');

        // Update RefreshToken logic to be unique per user AND per app
        // This allows simultaneous login on Consumer and Provider apps
        await RefreshToken.findOneAndUpdate(
            { user_id: user._id, appType: appType }, 
            { refresh_token },
            { upsert: true, new: true }
        );

        return { access_token, refresh_token };
    } catch (error) {
        console.error("Generate Tokens Error:", error);
        throw error;
    }
};