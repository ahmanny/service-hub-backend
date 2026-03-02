import { Provider } from '../models/provider.model';
import { ServiceType } from '../types/service.types';
import { ProviderListItem } from '../types/providers.types';
import { SearchPayload } from '../types/consumer';

class SearchServiceClass {
    constructor() {
        // super()
    }

    public async discoverProviders(payload: SearchPayload) {
        const { serviceType, lat, lng } = payload;

        const isAll = serviceType === "all";
        const limit = isAll ? 4 : 40;
        const categories = isAll
            ? ["barber", "hair_stylist", "electrician", "plumber", "house_cleaning"]
            : [serviceType as ServiceType];

        const results = await Promise.all(
            categories.map(async (type) => {
                const providers = await this.executeDiscoveryEngine(type, lat, lng, limit);
                return {
                    type,
                    providers: this.mapToSearchResult(providers)
                };
            })
        );

        if (isAll) {
            return results.reduce((acc, curr) => {
                acc[curr.type] = curr.providers;
                return acc;
            }, {} as Record<string, ProviderListItem[]>);
        }

        return results[0].providers; // Returns ProviderListItem[]
    }







    /**
     * THE DISCOVERY ENGINE
     * Handles: 
     * 1. Shop Distance 
     * 2. Service Area Radius 
     * 3. Bayesian Ranking
     */
    private async executeDiscoveryEngine(type: string, lat: number, lng: number, limit: number) {
        return await Provider.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [lng, lat] },
                    distanceField: "distanceFromShop",
                    distanceMultiplier: 0.001, // Meters to KM
                    key: "shopAddress.location",
                    spherical: true,
                    query: {
                        serviceType: type,
                        status: "approved",
                        isAvailable: true,
                        "serviceArea.location": { $exists: true }
                    },
                },
            },
            {
                $addFields: {
                    // Haversine Formula for distanceFromServiceCenter
                    distanceFromServiceCenter: {
                        $multiply: [
                            6371, // Earth's radius in KM
                            {
                                $acos: {
                                    $add: [
                                        {
                                            $multiply: [
                                                { $sin: { $divide: [{ $multiply: [lat, Math.PI] }, 180] } },
                                                { $sin: { $divide: [{ $multiply: [{ $arrayElemAt: ["$serviceArea.location.coordinates", 1] }, Math.PI] }, 180] } }
                                            ]
                                        },
                                        {
                                            $multiply: [
                                                { $cos: { $divide: [{ $multiply: [lat, Math.PI] }, 180] } },
                                                { $cos: { $divide: [{ $multiply: [{ $arrayElemAt: ["$serviceArea.location.coordinates", 1] }, Math.PI] }, 180] } },
                                                {
                                                    $cos: {
                                                        $divide: [
                                                            { $multiply: [{ $subtract: [{ $arrayElemAt: ["$serviceArea.location.coordinates", 0] }, lng] }, Math.PI] },
                                                            180
                                                        ]
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            },
            {
                $match: {
                    $or: [
                        { offersShopVisit: true },
                        {
                            homeServiceAvailable: true,
                            $expr: { $lte: ["$distanceFromServiceCenter", "$serviceArea.radiusKm"] }
                        }
                    ]
                }
            },
            {
                $sort: {
                    weightedRating: -1,
                    rating: -1,
                    distanceFromShop: 1
                }
            },
            { $limit: limit }
        ]);
    }

    private mapToSearchResult(providers: any[]): ProviderListItem[] {
        return providers.map((provider, index) => ({

            _id: provider._id.toString(),
            firstName: provider.firstName,
            serviceType: provider.serviceType,
            availabilityMode: provider.availabilityMode,
            basePrice: provider.basePriceFrom || 0,
            rating: provider.rating || 0,
            reviewCount: provider.reviewCount || 0,
            profilePicture: provider.profilePicture || null,
            distance: provider.distanceFromShop != null
                ? Number(provider.distanceFromShop.toFixed(2))
                : 0,
            duration: null,
            isClosest: index === 0,
            isTopRated: provider.weightedRating > 4.5
        }));
    }
}



export const SearchService = new SearchServiceClass();