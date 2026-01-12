import Exception from "../exceptions/Exception";
import ForbiddenAccessException from "../exceptions/ForbiddenAccessException";
import MissingParameterException from "../exceptions/MissingParameterException";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
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
            scheduledAt,
            locationType,
            geoAddress,
            textAddress,
            note,
        } = payload;


        // verify the slot is still availaible 
        const bookingDate = new Date(scheduledAt);
        const existingBooking = await Booking.findOne({
            providerId,
            scheduledAt: bookingDate,
            status: { $in: ["pending", "confirmed"] }
        });

        if (existingBooking) {
            throw new Exception("This time slot has just been taken. Please choose another.");
        }

        const provider = await Provider.findById(providerId).lean();
        if (!provider) throw new Exception("Provider not found");

        const selectedService = provider.services?.find((s) => s.value === service);
        if (!selectedService) throw new Exception("Service no longer available");

        const basePrice = selectedService.price;
        const homeFee = locationType === "home" ? 1200 : 0;
        const total = basePrice + homeFee;

        let finalLocation: any = { type: locationType };

        if (locationType === "home") {
            if (!geoAddress || !textAddress) {
                throw new MissingParameterException("Please provide your home address");
            }
            finalLocation.geoAddress = geoAddress;
            finalLocation.textAddress = textAddress;
        } else {
            // If shop, we grab the address directly from the provider's profile
            if (!provider.shopAddress) {
                throw new Exception("Provider does not have a shop address set");
            }
            finalLocation.textAddress = provider.shopAddress.address; // String address
            finalLocation.geoAddress = provider.shopAddress.location; // GeoJSON Point
        }



        const booking = await Booking.create({
            consumerId,
            providerId,
            service,
            serviceName: selectedService.name,
            serviceType: provider.serviceType,
            price: {
                service: basePrice,
                homeServiceFee: homeFee,
                total: total
            },
            scheduledAt: bookingDate,
            location: finalLocation,
            note,
            status: "pending",
        });

        return {
            bookingId: booking._id,
            status: booking.status,
        };
    }

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

    public async fetchBookingsDetails(payload: {
        bookingId: string,
        currentUserId: string,
        role: 'consumer' | 'provider'
    }) {
        const { bookingId, currentUserId, role } = payload;

        // Note: ensure you select/populate everything needed
        const booking = await Booking.findById(bookingId)
            .populate("providerId", "firstName rating profilePicture")
            .populate("consumerId", "firstName profilePicture")
            .lean();

        if (!booking) throw new ResourceNotFoundException("Booking not found");

        // Security Check
        const isOwner = role === 'consumer'
            ? booking.consumerId.toString() === currentUserId
            : booking.providerId.toString() === currentUserId;

        if (!isOwner) throw new ForbiddenAccessException("Unauthorized access to this booking");

        const provider: any = booking.providerId;

        return {
            _id: booking._id.toString(),
            serviceName: booking.serviceName,
            serviceType: booking.serviceType,
            status: booking.status,
            scheduledAt: booking.scheduledAt.toISOString(),
            createdAt: booking.createdAt?.toISOString(),
            updatedAt: booking.updatedAt?.toISOString(),

            provider: {
                _id: provider._id.toString(),
                firstName: provider.firstName,
                rating: provider.rating || 0,
                profilePicture: provider.profilePicture || null,
            },

            location: {
                type: booking.location.type,
                geoAddress: booking.location.geoAddress,
                textAddress: booking.location.textAddress,
            },

            price: {
                service: booking.price.service,
                homeServiceFee: booking.price.homeServiceFee,
                platformFee: booking.price.platformFee,
                total: booking.price.total,
            },
        };
    }

}

export const BookingService = new BookingServiceClass();


