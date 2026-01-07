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
    if (!req && !token) {
        return { token: null, is_valid_token: false, user: null, appType: null };
    }

    try {
        const _token = token ?? req?.headers.authorization?.split(' ')[1];

        if (!_token) {
            console.error('Token not found in request or arguments');
            return { token: null, is_valid_token: false, user: null, appType: null };
        }

        const is_valid_token = !!JwtService.verify(_token || '', (token_type || 'access'));
        let user: userType | null = null;
        let appType: AppRole | null = null;


        if (_token && is_valid_token) {
            let { id, appType: decodedAppType } = JwtService.decode(_token)?.payload as { id: string, appType: AppRole };
            console.log("ID", id)
            console.log("AppType", decodedAppType)

            let acct = await getUserById(id).lean()
            if (acct) {
                const { _id, ...rest } = acct
                user = {
                    _id: _id.toString(),
                    ...rest
                }
                appType = decodedAppType
            }
        }
        return {
            token: _token,
            is_valid_token,
            user,
            appType,
        };
    } catch (error) {
        console.log(error);
    }
};


export const generateTokens = async (user: any, appType: AppRole) => {
    console.log(appType)
    console.log(user)
    try {
        const payload = {
            id: user._id,
            appType: appType,
        };

        const access_token = JwtService.sign(payload, 'access');
        const refresh_token = JwtService.sign(payload, 'refresh');

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

