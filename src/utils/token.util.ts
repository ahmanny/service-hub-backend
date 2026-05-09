import type { Request } from 'express';
import { RefreshToken } from '../models/refresh-token.model';
import { JwtService } from '../services/jwt.service';
import { ConsumerProfileType } from '../types/consumer/profile.types';
import { getConsumerById } from '../models/consumer.model';
import { userType } from '../types/user.type';
import { getUserById } from '../models/user.model';
import { getAdminById } from '../models/admin.model';

export type AppRole = 'consumer' | 'provider' | 'admin';

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
        const _token = token ?? req?.query?.token as string ?? req?.headers.authorization?.split(' ')[1] ?? req?.cookies?.['access-token'];

        if (!_token) {
            console.error('Token not found in request or arguments');
            return { token: null, is_valid_token: false, user: null, appType: null };
        }

        const is_valid_token = !!JwtService.verify(_token || '', (token_type || 'access'));
        let user: userType | null = null;
        let appType: AppRole | null = null;


        if (_token && is_valid_token) {
            let decodedToken = JwtService.decode(_token)?.payload as { id: string, appType: AppRole, adminRole?: string };
            let { id, appType: decodedAppType, adminRole } = decodedToken;

            let acct = null;
            if (decodedAppType === 'admin') {
                acct = await getAdminById(id).lean();
            } else {
                acct = await getUserById(id).lean();
            }

            if (acct) {
                const { _id, ...rest } = acct as any;
                user = {
                    _id: _id.toString(),
                    ...rest,
                    adminRole: adminRole || rest.role
                } as any;
                appType = decodedAppType;
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
    try {
        const payload: any = {
            id: user._id,
            appType: appType,
        };

        if (appType === 'admin' && user.role) {
            payload.adminRole = user.role;
        }

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

