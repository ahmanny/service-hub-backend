import UnauthorizedAccessException from '../exceptions/UnauthorizedAccessException';
import MissingParameterException from '../exceptions/MissingParameterException';
import { addAddressToConsumer, Consumer, getConsumerById, getConsumerByUserId, IConsumerAddress, removeAddressFromConsumer, setDefaultAddress, updateConsumerById } from '../models/consumer.model';
import ResourceNotFoundException from '../exceptions/ResourceNotFoundException';
import { Types } from 'mongoose';
import { User } from '../models/user.model';
import { CreateProfilePayload, SearchPayload } from '../types/consumer';
import MOCK_PROVIDERS from "../data/mockProviders.json";
import { getDistance } from 'geolib';
import { getDirections } from '../utils/routeDirection.utils';
import { Provider } from '../models/provider.model';
import Exception from '../exceptions/Exception';


class ConsumerServiceClass {
    constructor() {
        // super()
    }

    // complete profile after sucessfull otp verification
    public async fetchProfile(userId: string | Types.ObjectId) {
        // We find the consumer and pull in all fields from the referenced 'User' model
        const profile = await Consumer.findOne({ userId })
            .populate("userId") // This brings in the full User document
            .lean({ virtuals: true }); // Converts to plain JS object + includes virtuals like fullName

        return {
            hasProfile: Boolean(profile),
            profile: profile || null
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


    /**
    * Service Methods for Consumer Address Management
    */
    public async addAddress(
        consumerId: string,
        payload: {
            label: string;
            formattedAddress: string;
            latitude: number;
            longitude: number;
        }
    ) {
        const { label, formattedAddress, latitude, longitude } = payload;

        // Check existing profile to see if this is the first address
        const profile = await getConsumerById(consumerId);
        if (!profile) throw new ResourceNotFoundException("Consumer not found");

        const isFirstAddress = !profile.addresses || profile.addresses.length === 0;

        // Structure the address according to the IConsumerAddress interface
        const addressData: IConsumerAddress = {
            label,
            formattedAddress,
            location: {
                type: 'Point',
                coordinates: [longitude, latitude], // Longitude first for GeoJSON
            },
            isDefault: false
        };

        const updatedConsumer = await addAddressToConsumer(consumerId, addressData);

        if (!updatedConsumer) {
            throw new Exception("Error Addings Address");
        }

        return { updatedConsumer };
    }

    // Delete an Address
    public async deleteAddress(consumerId: string, addressId: string) {
        const profile = await getConsumerById(consumerId);
        if (!profile) throw new ResourceNotFoundException("Consumer not found");

        const updatedConsumer = await removeAddressFromConsumer(consumerId, addressId);

        if (!updatedConsumer) {
            throw new Exception("Address could not be removed");
        }

        return updatedConsumer;
    }

    //  Set an Address as Default
    public async makeAddressDefault(consumerId: string, addressId: string) {
        const profile = await getConsumerById(consumerId);
        if (!profile) throw new ResourceNotFoundException("Consumer not found");

        const updatedConsumer = await setDefaultAddress(consumerId, addressId);

        if (!updatedConsumer) {
            throw new Exception("Address update failed");
        }

        return updatedConsumer;
    }

    public async searchNearbyProviders(payload: SearchPayload) {
        const {
            serviceType,
            service,
            lat,
            lng,
            maxDist = 2000,
            locationType,
        } = payload;

        // build geo query 
        const geoQuery: any = {
            serviceType,
        };
        // Filter by specific service (services.value)
        if (service) {
            geoQuery["services.value"] = service;
        }

        // Home service only
        if (locationType === "home") {
            geoQuery.homeServiceAvailable = true;
        }

        // Optional future-safe filters (keep commented until needed)
        // geoQuery.isAvailable = true;
        // geoQuery.isVerified = true;

        //  geo search
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
                    query: geoQuery,
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
                    const selectedService = service
                        ? provider.services?.find(
                            (s: any) => s.value === service
                        )
                        : null;

                    return {
                        _id: provider._id,
                        firstName: provider.firstName,
                        serviceType: provider.serviceType,
                        availabilityMode: provider.availabilityMode,
                        price: selectedService?.price ?? null,
                        serviceName: selectedService?.name ?? null,
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
