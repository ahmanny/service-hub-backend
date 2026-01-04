import Exception from "../exceptions/Exception";
import MissingParameterException from "../exceptions/MissingParameterException";
import { Booking, IBooking } from "../models/booking.model";
import { IProviderShopAddress, Provider } from "../models/provider.model";
import { CreateBookingPayload, fetchBookingsPayload } from "../types/booking.type";

class BookingServiceClass {
    constructor() {
        // super()
    }

    public async createBooking(payload: CreateBookingPayload) {
        const {
            consumerId,
            providerId,
            service,
            serviceName,
            scheduledAt,
            locationType,
            geoAddress,
            textAddress, // allowed ONLY for home
            note,
        } = payload;

        if (!consumerId || !providerId) {
            throw new Exception("Invalid consumer or provider");
        }

        if (!service || !serviceName) {
            throw new MissingParameterException("Service information is required");
        }

        if (!scheduledAt) {
            throw new MissingParameterException("scheduledAt is required");
        }

        if (!locationType) {
            throw new MissingParameterException("locationType is required");
        }

        const provider = await Provider.findById(providerId).select("shopAddress,services,serviceType");

        if (!provider) {
            throw new Exception("Provider not found");
        }

        let location: {
            type: "home" | "shop";
            geoAddress?: any;
            textAddress?: string | IProviderShopAddress;
        };

        /* HOME SERVICE */
        if (locationType === "home") {
            if (!geoAddress && !textAddress) {
                throw new MissingParameterException(
                    "Either geoAddress or textAddress is required for home service"
                );
            }

            // if (geoAddress && textAddress) {
            //     throw new MissingParameterException(
            //         "Provide either geoAddress or textAddress, not both"
            //     );
            // }

            location = {
                type: "home",
                ...(geoAddress && { geoAddress }),
                ...(textAddress && { textAddress }),
            };
        }
        /* SHOP SERVICE */
        else {

            if (geoAddress || textAddress) {
                throw new Exception(
                    "Shop service does not accept user-provided address"
                );
            }

            if (!provider.shopAddress) {
                throw new Exception("Provider shop address not set");
            }

            location = {
                type: "shop",
                textAddress: provider.shopAddress,
            };
        }

        // Get service price
        const selectedService = provider.services?.find((s: any) => s.value === service);

        if (!selectedService) {
            throw new Exception("Selected service not offered by provider");
        }

        const booking = await Booking.create({
            consumerId,
            providerId,
            service,
            serviceName,
            serviceType: provider.serviceType,
            price: selectedService.price,
            scheduledAt,
            location,
            note,
            status: "pending",
        });

        return {
            bookingId: booking._id,
            status: booking.status,
        };
    }

    // public async fetchBookings(payload: fetchBookingsPayload) {
    //     const { tab, consumerId, providerId, page = 1, skip = 0, limit = 10 } = payload;

    //     const query: any = {};
    //     if (consumerId) {
    //         query.consumerId = consumerId;
    //     }
    //     if (providerId) {
    //         query.providerId = providerId;
    //     }
    //     switch (tab) {
    //         case "upcoming":
    //             query.scheduledAt = { $gte: new Date() };
    //             query.status = { $in: ["accepted", "pending"] };
    //             break;
    //         case "past":
    //             query.scheduledAt = { $lt: new Date() };
    //             query.status = { $in: ["completed", "cancelled", "declined"] };
    //             break;
    //         case "pending":
    //             query.status = "pending";
    //             break;
    //         case "all":
    //         default:
    //             // no additional filters
    //             break;
    //     }
    //     const bookings = await Booking.find(query)
    //         .sort({ scheduledAt: -1 })
    //         .skip(skip + (page - 1) * limit)
    //         .limit(limit);

    //     const results = await Promise.all(
    //         bookings.map(async (booking) => {
    //             return {
    //                 _id: booking._id,
    //                 serviceName: booking.serviceName,
    //                 serviceType: booking.serviceType,
    //                 price: booking.price,
    //                 scheduledAt: booking.scheduledAt,
    //                 locationLabel: booking.location.type === "shop" ? "Come to shop" : "Home Service",
    //                 status: booking.status,
    //             };
    //         })
    //     );
    //     return { results };
    // }

    public async fetchBookings(payload: fetchBookingsPayload) {
        const { tab, consumerId, providerId, page = 1, limit = 10 } = payload;
        const skip = (page - 1) * limit;

        //  Build Query with specific MongoDB Filter type
        // const query: IBooking = {};
        const query: any = {};
        if (consumerId) query.consumerId = consumerId;
        if (providerId) query.providerId = providerId;

        const now = new Date();

        switch (tab) {
            case "upcoming":
                // Confirmed bookings that are in the future
                query.scheduledAt = { $gte: now };
                query.status = "accepted";
                break;
            case "past":
                // Anything in the past OR specifically marked as finished/cancelled
                query.$or = [
                    { scheduledAt: { $lt: now } },
                    { status: { $in: ["completed", "cancelled", "declined"] } }
                ];
                break;
            case "pending":
                // Only things waiting for action
                query.status = "pending";
                break;
            default:
                break;
        }

        // Execute Count and Find in parallel for performance
        const [bookings, totalCount] = await Promise.all([
            Booking.find(query)
                .sort({ scheduledAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(), // Returns plain objects, much faster
            Booking.countDocuments(query),
        ]);

        // Simple map (No Promise.all needed here since it's synchronous)
        const results = bookings.map((booking) => ({
            _id: booking._id,
            serviceName: booking.serviceName,
            serviceType: booking.serviceType,
            price: booking.price,
            scheduledAt: booking.scheduledAt,
            locationLabel: booking.location?.type === "shop" ? "Come to shop" : "Home Service",
            status: booking.status,
        }));

        return {
            results,
            pagination: {
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: page,
                hasNextPage: page * limit < totalCount,
            },
        };
    }


}

export const BookingService = new BookingServiceClass();


