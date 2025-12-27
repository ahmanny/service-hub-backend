import UnauthorizedAccessException from '../exceptions/UnauthorizedAccessException';
import MissingParameterException from '../exceptions/MissingParameterException';
import { Consumer, getConsumerById, getConsumerByUserId, updateConsumerById } from '../models/consumer.model';
import ResourceNotFoundException from '../exceptions/ResourceNotFoundException';
import { Types } from 'mongoose';
import { User } from '../models/user.model';
import { CreateProfilePayload, IProviderBookingProfile, LocationTuple, SearchPayload } from '../types/consumer';
import MOCK_PROVIDERS from "../data/mockProviders.json";
import { getDistance } from 'geolib';
import { getDirections } from '../utils/routeDirection.utils';
import { Provider } from '../models/provider.model';


class ConsumerServiceClass {
    constructor() {
        // super()
    }

    // complete profile after sucessfull otp verification
    public async fetchProfile(userId: string | Types.ObjectId) {
        const profile = await getConsumerByUserId(userId);

        return {
            hasProfile: Boolean(profile),
            profile: profile ?? null
        };
    }
    public async createProfile(payload: CreateProfilePayload) {
        const { userId, email, firstName, lastName } = payload;

        if (!userId || !firstName || !lastName) {
            throw new MissingParameterException("Please provide your details");
        }

        //  Check if User exists
        const user = await User.findById(userId);
        if (!user) {
            throw new ResourceNotFoundException("User not found");
        }

        // Update email if provided
        if (email) {
            user.email = email;
            user.isEmailVerified = false
            await user.save();
        }

        // Check if consumer profile already exists
        const existingProfile = await Consumer.findOne({ userId: user._id });
        if (existingProfile) {
            throw new ResourceNotFoundException("Profile already exists for this user");
        }

        // Create the consumer profile
        const newProfile = await Consumer.create({
            userId: user._id,
            firstName,
            lastName,
        });

        return {
            profile: newProfile,
        };
    }

    public async searchNearbyProviders(payload: SearchPayload) {
        const { serviceType, lat, lng, maxDist } = payload;
        //  Mongo geo search
        const providers = await Provider.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [lng, lat],
                    },
                    distanceField: "straightDistance",
                    // maxDistance: maxDist, // meters
                    spherical: true,
                    query: {
                        serviceType,
                        // isAvailable: true,
                        // isVerified: true,
                    },
                },
            },
            { $sort: { straightDistance: 1 } },
            { $limit: 3 }, // fetch 4 closest
        ]);
        // Enrich with time ,route distance and direction route
        const results = await Promise.all(
            providers.map(async (provider, index) => {
                try {
                    const direction = await getDirections(
                        [lng, lat],
                        provider.location.coordinates
                    );

                    const route = direction?.routes?.[0];

                    return {
                        _id: provider._id,
                        firstName: provider.firstName,
                        availabilityMode: provider.availabilityMode,
                        basePriceFrom: provider.basePriceFrom,
                        rating: provider.rating,
                        profilePicture: provider.profilePicture,

                        distance: route
                            ? Math.round((route.distance / 1000) * 10) / 10 // km
                            : Math.round((provider.straightDistance / 1000) * 10) / 10,

                        duration: route
                            ? Math.round(route.duration / 60) // minutes
                            : null,
                        directionCoordinates: route?.geometry?.coordinates ?? null,

                        isClosest: index === 0,
                    };
                } catch (error) {
                    // console.log(error)
                    // Fallback if routing fails
                    return {
                        _id: provider._id,
                        firstName: provider.firstName,
                        availabilityMode: provider.availabilityMode,
                        basePriceFrom: provider.basePriceFrom,
                        rating: provider.rating,
                        profilePicture: provider.profilePicture,

                        distance: Math.round((provider.straightDistance / 1000) * 10) / 10,
                        duration: null,
                        directionCoordinates: null,
                        isClosest: index === 0,
                    };
                }
            })
        );
        return results;
    }

    public async fetchProviderProfileForBooking(providerId: string) {
        const provider = await Provider.findById(providerId).select(
            {
                homeServiceAvailable: 1,
                services: 1,
                shopAddress: 1
            }
        ).lean()
        // { userId: providerId, isAvailable: true },


        if (!provider) {
            throw new ResourceNotFoundException("Provider not available");
        }

        return { provider };
    }




}

export const ConsumerService = new ConsumerServiceClass();
