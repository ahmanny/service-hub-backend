import { SearchPayload } from '../types/consumer';
import { getDirections } from '../utils/routeDirection.utils';
import { Provider } from '../models/provider.model';
import { Types } from 'mongoose';


class ProviderServiceClass {
    constructor() {
        // super()
    }
    public async fetchProfile(userId: string | Types.ObjectId) {
        const profile = await Provider.findOne({ userId })
            .populate({
                path: "userId",
                // Select only provider-related fields and common fields
                select: "consumerEmail providerPhone isProviderEmailVerified activeRoles createdAt",
            })
            .lean({ virtuals: true });

        return {
            hasProfile: Boolean(profile),
            profile: profile ? this.sanitizeProfile(profile) : null
        };
    }









        /**
     * PRIVATE UTILS
     */
    private sanitizeProfile(profile: any) {
        if (!profile) return null;

        // Extract the populated User document
        const { userId, ...profileData } = profile;

        return {
            ...profileData,
            // Clean up the User Identity object
            userId: {
                _id: userId?._id,
                phone: userId?.providerPhone,
                email: userId?.providerEmail,
                isEmailVerified: userId?.isProviderEmailVerified,
                activeRoles: userId?.activeRoles,
                createdAt: userId?.createdAt
            }
        };
    }


}


export const ProviderService = new ProviderServiceClass();