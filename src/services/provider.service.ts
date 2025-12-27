import UnauthorizedAccessException from '../exceptions/UnauthorizedAccessException';
import MissingParameterException from '../exceptions/MissingParameterException';
import { Consumer, getConsumerById, getConsumerByUserId, updateConsumerById } from '../models/consumer.model';
import ResourceNotFoundException from '../exceptions/ResourceNotFoundException';
import { Types } from 'mongoose';
import { User } from '../models/user.model';
import { CreateProfilePayload, LocationTuple, SearchPayload } from '../types/consumer';
import MOCK_PROVIDERS from "../data/mockProviders.json";
import { getDistance } from 'geolib';
import { getDirections } from '../utils/routeDirection.utils';


class ProviderServiceClass {
    constructor() {
        // super()
    }

    public async searchNearbyProviders(payload: SearchPayload) {
        const { serviceType, lat, lng, maxDist } = payload;

        // Filter by service type
        const filtered = MOCK_PROVIDERS.filter(
            (p) => p.serviceType === serviceType
        );

        // Compute straight-line distance (meters)
        const ranked = filtered
            .map((p) => {
                const straightDistance = getDistance(
                    { latitude: lat, longitude: lng },
                    { latitude: p.location.latitude, longitude: p.location.longitude }
                );

                return {
                    ...p,
                    straightDistance,
                };
            })
            .filter((p) => p.straightDistance <= maxDist)
            .sort((a, b) => a.straightDistance - b.straightDistance)
            .slice(0, 4);

        // Enrich ONLY with time + route distance and direction route
        const results = await Promise.all(
            ranked.map(async (provider, index) => {
                try {
                    const direction = await getDirections(
                        [lng, lat],
                        [provider.location.longitude, provider.location.latitude]
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

}


export const ProviderService = new ProviderServiceClass();