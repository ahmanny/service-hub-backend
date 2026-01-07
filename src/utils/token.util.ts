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


        if (_token && is_valid_token) {
            console.log("decoded", JwtService.decode(_token)?.payload)
            let { id } = JwtService.decode(_token)?.payload as { id: string };
            let acct = await getUserById(id).lean()
            if (acct) {
                const { _id, ...rest } = acct
                user = {
                    _id: _id.toString(),
                    ...rest
                }
            }
        }
        return {
            token: _token,
            is_valid_token,
            user,
            appType: "consumer" as AppRole
        };
    } catch (error) {
        console.log(error);
    }
};

export const generateTokens = async (user: any, appType: AppRole) => {

    console.log("AppType", appType)
    console.log("User", user)
    try {
        const payload = {
            _id: user._id,
            appType: appType,
        };

        console.log("jwt Payload", payload)

        const access_token = JwtService.sign(payload, 'access');
        const refresh_token = JwtService.sign(payload, 'refresh');

        await RefreshToken.findOneAndUpdate(
            { user_id: user._id, appType: appType },
            { refresh_token },
            { upsert: true, new: true }
        );


        return Promise.resolve({ access_token, refresh_token });
    } catch (error) {
        console.log(error);
    }
};
