import { SearchPayload } from '../types/consumer';
import { getDirections } from '../utils/routeDirection.utils';
import { IProviderProfile, Provider } from '../models/provider.model';
import { Types } from 'mongoose';
import { createProviderProfilePayload } from '../types/providers.types';
import Exception from '../exceptions/Exception';
import { User } from '../models/user.model';
import ResourceNotFoundException from '../exceptions/ResourceNotFoundException';


class ProviderServiceClass {
    constructor() {
        // super()
    }
    public async fetchProfile(userId: string | Types.ObjectId) {
        const profile = await Provider.findOne({ userId })
            .populate({
                path: "userId",
                // Select only provider-related fields and common fields
                select: "providerEmail providerPhone isProviderEmailVerified activeRoles createdAt",
            })
            .lean({ virtuals: true });

        return {
            hasProfile: Boolean(profile),
            profile: profile ? this.sanitizeProfile(profile) : null
        };
    }


    public async createProfile(payload: createProviderProfilePayload) {

        const {
            userId,
            firstName,
            lastName,
            email,
            profilePicture,
            bio,
            serviceType,
            services,
            shopAddress,
            offersHomeService,
            offersShopVisit,
            serviceArea,
            radiusKm,
            availability,
            avgServiceTime,
            verification
        } = payload;

        // Check if User Identity exists
        const user = await User.findById(userId);
        if (!user) {
            throw new ResourceNotFoundException("User identity not found");
        }

        // Check if profile already exists
        const existingProfile = await Provider.findOne({ userId: user._id });

        if (existingProfile) {
            throw new Exception("Provider profile already exists for this user.");
        }

        // Update Provider specific email if provided
        if (email) {
            // Ensure this email isn't already taken as a providerEmail by another user
            const emailExists = await User.findOne({
                providerEmail: email,
                _id: { $ne: user._id }
            });

            if (emailExists) {
                throw new Exception("This email is already associated with another Provider account");
            }
            console.log(email)
            user.providerEmail = email;
            user.isProviderEmailVerified = false;
        }

        // Update Active Roles tracking
        if (!user.activeRoles.includes('provider')) {
            user.activeRoles.push('provider');
        }
        await user.save();

        // create the provider profile then 
        // first calculate the base price 
        const basePriceFrom = services.length > 0
            ? Math.min(...services.map(s => s.price))
            : 0;

        const profileData: Partial<IProviderProfile> = {
            userId: user._id,
            firstName,
            lastName,
            email,
            profilePicture,
            bio,
            serviceType: serviceType as any,
            services,
            basePriceFrom,
            homeServiceAvailable: offersHomeService,
            offersShopVisit,

            ...(shopAddress && {
                shopAddress: {
                    address: shopAddress.formattedAddress,
                    location: {
                        type: 'Point',
                        coordinates: [shopAddress.longitude, shopAddress.latitude] //[long, lat]
                    }
                }
            }),

            serviceArea: {
                address: serviceArea.formattedAddress,
                location: {
                    type: 'Point',
                    coordinates: [serviceArea.center.longitude, serviceArea.center.latitude] //[long, lat]
                },
                radiusKm
            },

            availability,
            avgServiceTime,
            verification,
            isVerified: false, // Always false until admin reviews and verifies the user
            isAvailable: true,
            rating: 0
        };

        await Provider.create(profileData);

        const profile = await this.fetchProfile(user._id)

        return { profile }
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