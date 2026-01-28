import jwt from 'jsonwebtoken';
import { jwt as jwtConfig } from '../configs';

class JwtServiceClass {
    options: jwt.SignOptions;

    constructor() {
        this.options = {
            algorithm: jwtConfig.configs.algorithm,
        };
    }

    /**
 * Resolves the secret key based on the purpose of the token
 */
    private getSecretKey(type: 'access' | 'refresh' | 'verify') {
        switch (type) {
            case 'verify':
                // TODO:Use a dedicated secret for email/phone verification links
                return process.env.JWT_VERIFY_SECRET || 'fallback_verification_secret_123';
            case 'refresh':
                return jwtConfig.configs.refresh_token_secret_key;
            case 'access':
            default:
                return jwtConfig.configs.access_token_secret_key;
        }
    }

    /**
     * Resolves expiration time. 
     */
    private getExpireTime(type: 'access' | 'refresh' | 'verify') {
        switch (type) {
            case 'verify':
                return '48h';
            case 'refresh':
                return jwtConfig.configs.refresh_token_expiration_time;
            case 'access':
            default:
                return jwtConfig.configs.access_token_expiration_time;
        }
    }


    private getJwtOptions(type: 'access' | 'refresh' | 'verify') {
        return {
            ...this.options,
            expiresIn: this.getExpireTime(type),
        };
    }


    /**
    * Signs a new token
    */
    public sign(payload: any, token_type: 'access' | 'refresh' | 'verify' = 'access') {
        const dataToSign = {
            ...payload,
            id: payload.id || payload._id?.toString()
        };

        if (dataToSign._id) delete dataToSign._id;

        return jwt.sign(
            { ...dataToSign },
            this.getSecretKey(token_type),
            this.getJwtOptions(token_type) as jwt.SignOptions
        );
    }

    /**
     * Verifies a token. Returns the decoded payload or false if invalid/expired.
     */
    public verify(token: string, token_type: 'access' | 'refresh' | 'verify') {
        try {
            return jwt.verify(token, this.getSecretKey(token_type));
        } catch (error) {
            console.error(`JWT Verification Error [${token_type}]:`, (error as Error).message);
            return false;
        }
    }

    public decode(token: string) {
        return jwt.decode(token, { complete: true });
    }

}

export const JwtService = new JwtServiceClass();
