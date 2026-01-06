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
            serviceName,
            scheduledAt,
            locationType,
            geoAddress,
            textAddress,
            note,
        } = payload;

        // Basic Validation of required fields
        if (!consumerId || !providerId) throw new Exception("Invalid consumer or provider");
        if (!service || !serviceName) throw new MissingParameterException("Service information is required");

        // Ensure the booking isn't in the past
        const bookingDate = new Date(scheduledAt);
        if (isNaN(bookingDate.getTime()) || bookingDate < new Date()) {
            throw new Exception("Scheduled time must be a valid future date");
        }

        // Fetch Provider Details
        const provider = await Provider.findById(providerId)
            .select("shopAddress services serviceType")
            .lean();

        if (!provider) throw new Exception("Provider not found");

        // Location Strategy
        let location: any = { type: locationType };

        if (locationType === "home") {
            if (!geoAddress && !textAddress) {
                throw new MissingParameterException("Address is required for home service");
            }
            location.geoAddress = geoAddress;
            location.textAddress = textAddress;
        } else {
            // Shop service
            if (!provider.shopAddress) {
                throw new Exception("This provider does not have a physical shop address set");
            }
            // Take a snapshot of the shop address at the time of booking
            location.textAddress = provider.shopAddress;
        }

        // Pricing & Service Validation
        const selectedService = provider.services?.find((s: any) => s.value === service);
        if (!selectedService) {
            throw new Exception("Selected service is no longer offered by this provider");
        }

        // Create Booking
        const booking = await Booking.create({
            consumerId,
            providerId,
            service,
            serviceName,
            serviceType: provider.serviceType,
            price: selectedService.price, // Snapshotted price
            scheduledAt: bookingDate,
            location,
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
        const booking = await Booking.findById(bookingId)
            .populate("providerId", "firstName rating profilePicture")
            .populate("consumerId", "firstName profilePicture")
            .lean();

        if (!booking) throw new ResourceNotFoundException("Booking not found");

        // SECURITY: Extra check to ensure the user actually belongs to this booking
        const isOwner = role === 'consumer'
            ? booking.consumerId._id.toString() === currentUserId
            : booking.providerId._id.toString() === currentUserId;

        if (!isOwner) throw new ForbiddenAccessException("Unauthorized access to this booking");

        const provider: any = booking.providerId;

        const response = {
            _id: booking._id.toString(),
            serviceName: booking.serviceName,
            serviceType: booking.serviceType,
            status: booking.status,
            scheduledAt: booking.scheduledAt.toISOString(),
            createdAt: booking.createdAt?.toISOString(),
            updatedAt: booking.updatedAt?.toISOString(),
            __v: booking.__v,

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
                service: booking.price, // This is the snapshotted price from createBooking
                homeServiceFee: booking.location.type === "home" ? (provider.homeServiceFee || 0) : null,
                // Total calculation: base price + (home fee if applicable)
                total: booking.location.type === "home"
                    ? booking.price + (provider.homeServiceFee || 0)
                    : booking.price,
            },
        };

    }


}

export const BookingService = new BookingServiceClass();


