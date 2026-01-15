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
        const deadline = this.calculateDeadline(bookingDate);

        // Create a 1-minute window to avoid millisecond/rounding mismatches
        const startWindow = new Date(bookingDate);
        startWindow.setSeconds(0, 0);

        const endWindow = new Date(bookingDate);
        endWindow.setSeconds(59, 999);

        const existingBooking = await Booking.findOne({
            providerId,
            scheduledAt: {
                $gte: startWindow,
                $lte: endWindow
            },
            status: { $in: ["pending", "accepted", "confirmed"] }
        });

        if (existingBooking) {
            throw new Exception("This time slot has just been taken.");
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
            console.log(geoAddress, textAddress)
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
            deadlineAt: deadline,
            status: "pending",
        });

        return {
            bookingId: booking._id,
            firstName: provider.firstName,
            status: booking.status,
            deadlineAt: deadline
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
                    { status: { $in: ["completed", "cancelled", "declined", "expired"] } }
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
            price: booking.price.total,
            scheduledAt: booking.scheduledAt,
            locationLabel: booking.location?.type === "shop" ? "In Shop Service" : "Home Service",
            status: booking.status,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt,
            _v: booking.__v
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

        const provider: any = booking.providerId;

        return {
            _id: booking._id.toString(),
            serviceName: booking.serviceName,
            serviceType: booking.serviceType,
            status: booking.status,

            scheduledAt: booking.scheduledAt.toISOString(),
            deadlineAt: booking.deadlineAt?.toISOString(),
            cancelledAt?: booking.cancelledAt?.toISOString(),
            declinedAt?: booking.declinedAt?.toISOString(),
            acceptedAt?: booking.acceptedAt?.toISOString(),
            rescheduledAt?:booking.rescheduledAt?.toISOString(),
        
            note: booking?.note,
            declineReason: booking?.declineReason,
            expiredMessage: booking?.expiredMessage,
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
    public async updateBookingStatus(payload: {
        bookingId: string;
        action: "accept" | "decline" | "cancel" | "reschedule";
        reason?: string;
        newScheduledAt?: string;
        userId: string;
    }) {
        const { bookingId, action, reason, newScheduledAt, userId } = payload;

        const booking = await Booking.findById(bookingId);
        if (!booking) throw new ResourceNotFoundException("This booking record no longer exists.");

        const isProvider = booking.providerId.toString() === userId;
        const isConsumer = booking.consumerId.toString() === userId;

        switch (action) {
            case "accept":
                if (!isProvider) {
                    throw new ForbiddenAccessException("Only the service provider can accept this booking.");
                }
                if (booking.status !== "pending") {
                    throw new Exception(`Cannot accept a booking that is already ${booking.status}.`);
                }
                booking.status = "accepted";
                booking.acceptedAt = new Date();
                break;

            case "decline":
                if (!isProvider) {
                    throw new ForbiddenAccessException("Only the service provider can decline this request.");
                }
                booking.status = "declined";
                booking.declinedAt = new Date();
                booking.declineReason = reason || "Provider declined the request.";
                break;

            case "cancel":
                if (!isProvider && !isConsumer) {
                    throw new ForbiddenAccessException("You do not have permission to cancel this booking.");
                }
                if (booking.status === "completed") {
                    throw new Exception("Cannot cancel a booking that is already marked as completed.");
                }
                booking.status = "cancelled";
                booking.cancelledAt = new Date();
                booking.cancelMessage = reason || `Cancelled by ${isProvider ? 'provider' : 'user'}.`;
                break;

            case "reschedule":
                if (!isConsumer) {
                    throw new ForbiddenAccessException("Currently, only customers can initiate a reschedule.");
                }
                if (!newScheduledAt) {
                    throw new MissingParameterException("Please select a new date and time.");
                }

                const newDate = new Date(newScheduledAt); \
                const startWindow = new Date(newDate);
                startWindow.setSeconds(0, 0);

                const endWindow = new Date(newDate);
                endWindow.setSeconds(59, 999);

                const isTaken = await Booking.findOne({
                    providerId: booking.providerId,
                    scheduledAt: {
                        $gte: startWindow,
                        $lte: endWindow
                    },
                    status: { $in: ["pending", "accepted", "confirmed"] },
                    _id: { $ne: booking._id }
                });

                if (isTaken) {
                    throw new Exception("The new time slot is already booked by someone else.");
                }

                // Update the booking details
                booking.scheduledAt = newDate;
                booking.rescheduledAt = new Date();

                booking.status = "pending";

                booking.deadlineAt = this.calculateDeadline(newDate);

                break;
        }

        await booking.save();
        return booking;
    }

    public async getRescheduleData(bookingId: string, userId: string) {
        const booking = await Booking.findById(bookingId)
            .populate({
                path: 'providerId',
                select: 'availability firstName serviceType shopAddress'
            });

        if (!booking) {
            throw new ResourceNotFoundException("This booking no longer exists.");
        }

        // Security check
        if (booking.consumerId.toString() !== userId) {
            throw new ForbiddenAccessException("Unauthorized access.");
        }

        // Fetch live booked slots
        const activeBookings = await Booking.find({
            providerId: booking.providerId._id,
            status: { $in: ["pending", "accepted"] },
            scheduledAt: { $gte: new Date() }
        }).select("scheduledAt").lean();

        const bookedSlots = activeBookings.map(b => {
            const d = new Date(b.scheduledAt);
            return {
                date: d.toISOString().split('T')[0],
                startTime: `${d.getHours().toString().padStart(2, '0')}:00`
            };
        });

        // Convert Mongoose Doc to plain object before spreading
        const providerData = (booking.providerId as any).toObject();

        return {
            ...providerData,
            bookedSlots
        };
    }
    public async cleanupExpiredBookings() {
        const now = new Date();

        // 1. Fetch all pending bookings to see what we are dealing with
        const pendingBookings = await Booking.find({ status: "pending" })
            .select("deadlineAt status _id")
            .lean();

        console.log(`[CRON DEBUG] Found ${pendingBookings.length} total pending bookings.`);
        console.log(`[CRON DEBUG] Current Server Time (UTC): ${now.toISOString()}`);

        // Inside your cleanupExpiredBookings method
        if (pendingBookings.length > 0) {
            pendingBookings.forEach((b, index) => {
                // Fix: Use a fallback or check if deadlineAt exists
                if (!b.deadlineAt) {
                    console.log(`   -> [${index + 1}] ID: ${b._id} | ⚠️ No deadline set!`);
                    return;
                }

                const deadline = new Date(b.deadlineAt); // TS is now happy because we checked it
                const isExpired = deadline < now;

                console.log(
                    `   -> [${index + 1}] ID: ${b._id} | Deadline: ${deadline.toISOString()} | Overdue: ${isExpired}`
                );
            });
        }

        // 2. Perform the update
        const result = await Booking.updateMany(
            {
                status: "pending",
                deadlineAt: { $lt: now }
            },
            {
                $set: {
                    status: "expired",
                    expiredMessage: "System: Request expired due to provider inactivity."
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`[CRON] ✅ Successfully expired ${result.modifiedCount} bookings.`);
        }

        return result.modifiedCount;
    }





    // Private functions
    private calculateDeadline(scheduledAt: Date): Date {
        const now = new Date();
        const diffInHours = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);

        let minutesToAdd: number;

        if (diffInHours <= 2) {
            minutesToAdd = 15; // Extremely urgent
        } else if (diffInHours <= 24) {
            minutesToAdd = 30; // Same day
        } else if (diffInHours <= 48) {
            minutesToAdd = 360; // Next day (6 hours)
        } else {
            minutesToAdd = 1440; // 2+ days away (24 hours)
        }

        return new Date(now.getTime() + minutesToAdd * 60000);
    }

}

export const BookingService = new BookingServiceClass();


