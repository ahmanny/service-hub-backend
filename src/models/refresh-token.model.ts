import { Schema, Types, model } from 'mongoose';
import { jwt } from '../configs';
import { AppRole } from '../utils'; // Ensure AppRole is exported from utils

interface IRefreshToken {
    refresh_token: string;
    user_id: Types.ObjectId;
    appType: AppRole; // The specific app this session belongs to
    createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
    refresh_token: {
        type: String,
        required: true,
        trim: true,
    },
    user_id: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    appType: {
        type: String,
        required: true,
        enum: ['consumer', 'provider'], // Strict safety
    },
    createdAt: {
        type: Date,
        default: Date.now,
        // Automatically deletes from DB when the refresh token expires
        // expires: jwt.configs.refresh_token_expiration_time_in_db, 
    },
});

/**
 * INDEXING
 * We index by user_id and appType so that a user can find their 
 * specific session for the specific app quickly.
 */
RefreshTokenSchema.index({ user_id: 1, appType: 1 });

export const RefreshToken = model<IRefreshToken>('RefreshToken', RefreshTokenSchema);