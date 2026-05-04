import { Types } from "mongoose";
import Exception from "../exceptions/Exception";
import ForbiddenAccessException from "../exceptions/ForbiddenAccessException";
import MissingParameterException from "../exceptions/MissingParameterException";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import { Booking, IBooking } from "../models/booking.model";
import { IProviderShopAddress, Provider } from "../models/provider.model";
import { BookingStatus, CreateBookingPayload, DisputeReason, fetchBookingsPayload, PaymentStatus, PayoutStatus } from "../types/booking.types";
import { Consumer } from "../models/consumer.model";
import { WalletService } from "./wallet/wallet.service";
import mongoose from "mongoose";
import { BookingStatusManager } from "../utils/booking-status-manager";
import { DisputeService } from "./dispute.service";
import { NotificationService } from "./notifications.service";
import BadRequestException from "../exceptions/BadRequestException";
import { Rating } from "../models/rating.model";
import { ProviderService } from "./provider/provider.service";

class BookingServiceClass {
    constructor() {
        // super()
    }

    public async createBooking(payload: CreateBookingPayload) {
        const { consumerId, providerId, service, scheduledAt, locationType, geoAddress, textAddress, note } = payload;

        const bookingDate = new Date(scheduledAt);
        const deadline = this.calculateDeadline(bookingDate);

        const startWindow = new Date(bookingDate);
        startWindow.setSeconds(0, 0);
        const endWindow = new Date(bookingDate);
        endWindow.setSeconds(59, 999);

        const existingBooking = await Booking.findOne({
            providerId,
            scheduledAt: { $gte: startWindow, $lte: endWindow },
            status: { $in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] }
        });

        if (existingBooking) throw new Exception("This time slot has just been taken.");

        const provider = await Provider.findById(providerId).lean();
        if (!provider) throw new Exception("Provider not found");

        const selectedService = provider.services?.find((s) => s.value === service);
        if (!selectedService) throw new Exception("Service no longer available");

        const basePrice = selectedService.price;
        const homeFee = locationType === "home" ? 1200 : 0;

        let finalLocation: any = { type: locationType };
        if (locationType === "home") {
            if (!geoAddress || !textAddress) throw new MissingParameterException("Please provide your home address");
            finalLocation.geoAddress = geoAddress;
            finalLocation.textAddress = textAddress;
        } else {
            if (!provider.shopAddress) throw new Exception("Provider does not have a shop address set");
            finalLocation.textAddress = provider.shopAddress.address;
            finalLocation.geoAddress = provider.shopAddress.location;
        }

        const booking = await Booking.create({
            consumerId,
            providerId,
            service,
            serviceName: selectedService.name,
            serviceType: provider.serviceType,
            price: { service: basePrice, homeServiceFee: homeFee, total: basePrice + homeFee },
            scheduledAt: bookingDate,
            location: finalLocation,
            note,
            deadlineAt: deadline,
            status: BookingStatus.PENDING,
        });

        return {
            bookingId: booking._id,
            firstName: provider.firstName,
            status: booking.status,
            serviceName: booking.serviceName,
            deadlineAt: deadline,
            providerId
        };
    }
    public async fetchBookings(payload: fetchBookingsPayload) {
        const { tab, providerId, consumerId, lat, lng } = payload;
        const now = new Date();

        const pipeline: any[] = [];

        //  Geo-spatial Distance Calculation
        if (lat !== undefined && lng !== undefined) {
            pipeline.push({
                $geoNear: {
                    near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
                    distanceField: "distance",
                    spherical: true,
                    distanceMultiplier: 0.001
                }
            });
        }

        // Build Match Filter
        const matchQuery: any = {};
        if (providerId) matchQuery.providerId = new Types.ObjectId(providerId);
        if (consumerId) matchQuery.consumerId = new Types.ObjectId(consumerId);

        switch (tab) {
            case "upcoming":
                matchQuery.status = { $in: ["accepted", "in_progress", "completion_pending"] };
                break;
            case "past":
                matchQuery.status = { $in: ["completed", "cancelled", "declined", "expired", "disputed"] };
                break;
            case "pending":
                matchQuery.status = "pending";
                break;
        }

        pipeline.push({ $match: matchQuery });

        pipeline.push(
            {
                $lookup: {
                    from: "consumers",
                    localField: "consumerId",
                    foreignField: "_id",
                    as: "consumerData"
                }
            },
            { $unwind: { path: "$consumerData", preserveNullAndEmptyArrays: true } }
        );

        //  Sorting logic
        pipeline.push({ $sort: { scheduledAt: tab === "upcoming" ? 1 : -1 } });

        // Execute Pipeline
        const bookings = await Booking.aggregate(pipeline);

        //  Enhanced Mapping for Frontend Trust Engine
        const results = bookings.map((b) => {
            const isCompletionPending = b.status === "completion_pending";
            const isInProgress = b.status === "in_progress";

            // Logic Helpers
            const canDispute = isCompletionPending && b.disputeDeadline && now < b.disputeDeadline;
            const canComplete = ["in_progress", "completion_pending"].includes(b.status);

            return {
                _id: b._id.toString(),
                serviceName: b.serviceName,
                serviceType: b.serviceType,
                status: b.status,
                paymentStatus: b.paymentStatus,
                payoutStatus: b.payoutStatus,

                // Critical Trust Engine Helpers
                disputeDeadline: b.disputeDeadline?.toISOString(),
                canDispute: canDispute || false,
                canComplete: canComplete || false,
                isDisputed: b.isDisputed || false,
                disputeId: b.disputeId?.toString(),

                // Time Tracking
                scheduledAt: b.scheduledAt.toISOString(),
                deadlineAt: b.deadlineAt?.toISOString(),
                createdAt: b.createdAt.toISOString(),
                updatedAt: b.updatedAt?.toISOString(),
                actualStartTime: b.actualStartTime?.toISOString(),

                // UI Helpers
                locationLabel: b.location.type === "shop" ? "Shop Visit" : "Home Service",
                price: b.price.total,
                distance: b.distance ? `${b.distance.toFixed(1)} km` : undefined,
                autoStarted: b.autoStarted || false,
                __v: b.__v,

                // Participant
                consumer: {
                    _id: b.consumerData?._id.toString(),
                    firstName: b.consumerData?.firstName || "Customer",
                    profilePicture: b.consumerData?.profilePicture || null
                }
            };
        });

        return { results };
    }
    public async fetchBookingsDetails(payload: {
        bookingId: string,
        currentUserId?: string,
    }) {
        const { bookingId, currentUserId } = payload;

        const booking = await Booking.findById(bookingId)
            .populate("providerId", "firstName rating profilePicture")
            .populate("consumerId", "firstName rating profilePicture")
            .lean();

        if (!booking) throw new ResourceNotFoundException("Booking not found");

        const provider: any = booking.providerId;
        const consumer: any = booking.consumerId;

        let ratingData = null;
        if (booking.isRated) {
            ratingData = await Rating.findOne({ bookingId: booking._id })
                .select("rating comment createdAt")
                .lean();
        }

        const isActiveOrDone = ["accepted", "in_progress", "completed"].includes(booking.status);

        return {
            _id: booking._id.toString(),
            serviceName: booking.serviceName,
            serviceType: booking.serviceType,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            payoutStatus: booking.payoutStatus,

            // Logic Helpers
            disputeDeadline: booking.disputeDeadline?.toISOString(),
            canDispute: booking.status === BookingStatus.COMPLETION_PENDING &&
                new Date() < (booking.disputeDeadline || 0),
            canComplete: [BookingStatus.IN_PROGRESS, BookingStatus.COMPLETION_PENDING].includes(booking.status),
            isDisputed: booking.isDisputed || false,
            disputeId: booking.disputeId?.toString(),
            autoStarted: booking.autoStarted || false,

            isRated: booking.isRated || false,
            rating: ratingData ? {
                score: ratingData.rating,
                comment: ratingData.comment,
                createdAt: ratingData.createdAt.toISOString(),
            } : null,

            // Full Timeliners
            scheduledAt: booking.scheduledAt.toISOString(),
            deadlineAt: booking.deadlineAt?.toISOString(),
            acceptedAt: booking.acceptedAt?.toISOString(),
            actualStartTime: booking.actualStartTime?.toISOString(),
            completionPendingAt: booking.completionPendingAt?.toISOString(),
            completedAt: booking.completedAt?.toISOString(),
            cancelledAt: booking.cancelledAt?.toISOString(),
            declinedAt: booking.declinedAt?.toISOString(),
            createdAt: booking.createdAt?.toISOString(),
            updatedAt: booking.updatedAt?.toISOString(),
            rescheduledAt: booking.rescheduledAt?.toISOString(),

            // Status Messages
            note: booking.note,
            declineReason: booking.declineReason,
            expiredMessage: booking.expiredMessage,
            cancelMessage: booking.cancelMessage,

            provider: {
                _id: provider._id.toString(),
                firstName: provider.firstName,
                rating: provider.rating || 0,
                profilePicture: provider.profilePicture || null,
            },
            consumer: {
                _id: consumer._id.toString(),
                firstName: consumer.firstName,
                rating: consumer.rating || 0,
                profilePicture: consumer.profilePicture || null,
            },

            /**
             * Location Privacy Logic: 
             * Reveal address if accepted, in_progress, or completed.
             */
            location: {
                type: booking.location.type, // Always reveal (e.g., 'home' or 'shop')
                geoAddress: isActiveOrDone ? booking.location.geoAddress : null,
                textAddress: isActiveOrDone ? booking.location.textAddress : "Address hidden",
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
        action: "accept" | "decline" | "cancel" | "reschedule" | "start" | "complete" | "dispute" | "confirm" | "rate";
        reason?: string;
        newScheduledAt?: string;
        userId: string;
        disputeReason?: DisputeReason;
        rating?: number;
        comment?: string;
    }) {
        const { bookingId, action, reason, newScheduledAt, userId, disputeReason, rating, comment } = payload;
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const booking = await Booking.findById(bookingId).session(session);
            if (!booking) throw new ResourceNotFoundException("Booking not found.");

            const isProvider = booking.providerId.toString() === userId;
            const isConsumer = booking.consumerId.toString() === userId;

            switch (action) {
                case "accept":
                    if (!isProvider) throw new ForbiddenAccessException("Only providers can accept.");
                    await BookingStatusManager.transition(booking, BookingStatus.ACCEPTED, session);
                    break;

                case "decline":
                    if (!isProvider) throw new ForbiddenAccessException("Only providers can decline.");
                    booking.declineReason = reason || "Provider declined.";
                    await BookingStatusManager.transition(booking, BookingStatus.DECLINED, session);
                    break;

                case "cancel":
                    if (!isProvider && !isConsumer) throw new ForbiddenAccessException("Unauthorized.");
                    booking.cancelMessage = reason || `Cancelled by ${isProvider ? 'provider' : 'user'}.`;
                    await BookingStatusManager.transition(booking, BookingStatus.CANCELLED, session);
                    break;

                case "reschedule":
                    if (!isConsumer) throw new ForbiddenAccessException("Only customers can reschedule.");
                    if (!newScheduledAt) throw new MissingParameterException("Select a new date.");

                    const newDate = new Date(newScheduledAt);

                    // Check slot availability...
                    const startWindow = new Date(newDate);
                    startWindow.setSeconds(0, 0);
                    const endWindow = new Date(newDate);
                    endWindow.setSeconds(59, 999);

                    const existingBooking = await Booking.findOne({
                        providerId: booking.providerId,
                        scheduledAt: { $gte: startWindow, $lte: endWindow },
                        status: { $in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] }
                    });

                    if (existingBooking) throw new Exception("This time slot has just been taken.");

                    booking.scheduledAt = newDate;
                    booking.rescheduledAt = new Date();
                    booking.deadlineAt = this.calculateDeadline(newDate);
                    booking.status = BookingStatus.PENDING;
                    break;

                case "start":
                    if (!isProvider) throw new ForbiddenAccessException("Only providers can start.");
                    await BookingStatusManager.transition(booking, BookingStatus.IN_PROGRESS, session);
                    break;

                case "complete":
                    if (!isProvider) throw new ForbiddenAccessException("Only providers can complete.");
                    await BookingStatusManager.transition(booking, BookingStatus.COMPLETION_PENDING, session);
                    break;

                case "confirm":
                    if (!isConsumer) throw new ForbiddenAccessException("Only customers can confirm completion.");

                    if (booking.status !== BookingStatus.COMPLETION_PENDING) {
                        throw new BadRequestException("Booking cannot be confirmed at this stage.");
                    }

                    const confirmedBooking = await Booking.findOneAndUpdate(
                        {
                            _id: booking._id,
                            status: BookingStatus.COMPLETION_PENDING,
                            isDisputed: { $ne: true },
                        },
                        {
                            $set: {
                                status: BookingStatus.COMPLETED,
                                completedAt: new Date(),
                            },
                        },
                        { new: true, session }
                    );

                    if (!confirmedBooking) {
                        throw new BadRequestException("Booking could not be confirmed. It may already be disputed or completed.");
                    }

                    await WalletService.movePendingToAvailable(confirmedBooking, session);
                    booking.status = confirmedBooking.status;
                    booking.completedAt = confirmedBooking.completedAt;
                    booking.payoutStatus = PayoutStatus.AVAILABLE;
                    break;

                case "rate":
                    if (!isConsumer) throw new ForbiddenAccessException("Only customers can rate.");
                    if (booking.status !== BookingStatus.COMPLETED) throw new BadRequestException("Service not completed.");
                    if (booking.isRated) throw new BadRequestException("Already rated.");
                    if (!rating || rating < 1 || rating > 5) throw new BadRequestException("Valid rating required.");

                    // Create the Rating record
                    await Rating.create([{
                        bookingId: booking._id,
                        providerId: booking.providerId,
                        consumerId: booking.consumerId,
                        rating,
                        comment
                    }], { session });

                    // Mark booking as rated
                    booking.isRated = true;

                    // Update Provider's Aggregate Rating
                    await ProviderService.updateProviderRatingStats(
                        booking.providerId.toString(),
                        rating, // the stars the user just gave
                        session
                    );
                    break;

                case "dispute":
                    if (!isConsumer) {
                        throw new ForbiddenAccessException("Only the client can initiate a dispute.");
                    }

                    await DisputeService.raiseDispute({
                        bookingId: booking._id.toString(),
                        userId,
                        reason: disputeReason || DisputeReason.OTHER,  // In this context, 'reason' is the 'type' of dispute
                        description: payload.reason || "Dispute raised by customer", // Fallback description
                        evidence: [], // You can expand the payload to accept evidence if needed
                    }, session);

                    break;
            }

            await booking.save({ session });
            await session.commitTransaction();

            // Notification lookup
            const [consumer, provider] = await Promise.all([
                Consumer.findById(booking.consumerId).select('firstName lastName').lean(),
                Provider.findById(booking.providerId).select('firstName lastName').lean()
            ]);

            const consumerName = consumer ? `${consumer.firstName} ${consumer.lastName}` : "A client";
            const providerName = provider ? `${provider.firstName} ${provider.lastName}` : "A provider";

            // 2. Pass these to your notification method (Update the signature to accept providerName)
            this.sendStatusNotification(booking, action, providerName).catch(console.error);



            return {
                ...booking.toObject(),
                bookingId: booking._id.toString(),
                consumerId: booking.consumerId.toString(),
                providerId: booking.providerId.toString(),
                consumerName,
                providerName,
                serviceName: booking.serviceName
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
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


    // cron jobs
    public async processAcceptedZombies() {
        const now = Date.now();
        const fiveMinutesLate = new Date(now - 5 * 60000);
        const fifteenMinutesLate = new Date(now - 15 * 60000);

        // Find all accepted bookings that are 15+ mins past scheduled time
        const zombies = await Booking.find({
            status: BookingStatus.ACCEPTED,
            scheduledAt: { $lte: fifteenMinutesLate }
        });

        for (const b of zombies) {
            // If consumer never paid — cancel the booking
            if (b.paymentStatus !== PaymentStatus.HELD) {
                b.cancelMessage = "System: Booking auto-cancelled — payment was not completed.";
                await BookingStatusManager.transition(b, BookingStatus.CANCELLED);

                this.sendStatusNotification(b, 'auto_cancel').catch(err =>
                    console.error(`[CRON NOTIF ERROR] Auto-cancel for ${b._id}:`, err));

                console.log(`[CRON] Auto-cancelled unpaid booking: ${b._id}`);
                continue; // Skip to next booking
            }

            // Consumer paid — auto start as normal
            b.autoStarted = true;
            await BookingStatusManager.transition(b, BookingStatus.IN_PROGRESS);

            this.sendStatusNotification(b, 'auto_start').catch(err =>
                console.error(`[CRON NOTIF ERROR] Zombie start for ${b._id}:`, err));

            console.log(`[CRON] Auto-started paid booking: ${b._id}`);
        }

        // Nudge provider if 5+ mins late and warning not sent yet
        const needsNudge = await Booking.find({
            status: BookingStatus.ACCEPTED,
            scheduledAt: { $lte: fiveMinutesLate },
            "reminders.lateWarningSent": { $ne: true }
        });

        for (const b of needsNudge) {
            this.sendStatusNotification(b, 'imminent_warning').catch(err =>
                console.error(`[CRON NOTIF ERROR] Imminent warning for ${b._id}:`, err)
            );
            await Booking.updateOne(
                { _id: b._id },
                { $set: { "reminders.lateWarningSent": true } }
            );
        }
    }
    public async cleanupExpiredBookings() {
        const now = new Date();

        const expiredBookings = await Booking.find({
            status: BookingStatus.PENDING,
            deadlineAt: { $lt: now }
        });

        if (expiredBookings.length === 0) return 0;

        const result = await Booking.updateMany(
            { _id: { $in: expiredBookings.map(b => b._id) } },
            {
                $set: {
                    status: BookingStatus.EXPIRED,
                    expiredMessage: "System: Request expired due to provider inactivity."
                }
            }
        );

        // Notify the Consumer that their request was never accepted
        for (const b of expiredBookings) {
            this.sendStatusNotification(b, 'expired').catch(err =>
                console.error(`[CRON NOTIF ERROR] Expiry for ${b._id}:`, err)
            );
        }

        if (result.modifiedCount > 0) {
            console.log(`[CRON] Successfully expired ${result.modifiedCount} bookings.`);
        }

        return result.modifiedCount;
    }
    public async processPendingPayouts() {
        const now = new Date();

        //  Find bookings where the 2-hour dispute window has passed
        const eligibleBookings = await Booking.find({
            status: BookingStatus.COMPLETION_PENDING,
            disputeDeadline: { $lte: now }
        });

        if (eligibleBookings.length === 0) return;

        console.log(`[CRON] Processing payouts for ${eligibleBookings.length} bookings...`);

        for (const booking of eligibleBookings) {
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                const completedBooking = await Booking.findOneAndUpdate(
                    {
                        _id: booking._id,
                        status: BookingStatus.COMPLETION_PENDING,
                        isDisputed: { $ne: true },
                        disputeDeadline: { $lte: now },
                    },
                    {
                        $set: {
                            status: BookingStatus.COMPLETED,
                            completedAt: now,
                        },
                    },
                    { new: true, session }
                );

                if (!completedBooking) {
                    await session.abortTransaction();
                    continue;
                }

                await WalletService.movePendingToAvailable(completedBooking, session);

                await session.commitTransaction();
                console.log(`[CRON] Payout successful for Booking: ${booking._id}`);

                this.sendStatusNotification(booking, 'complete').catch(console.error);;
            } catch (error) {
                await session.abortTransaction();
                console.error(`[CRON ERROR] Payout failed for ${booking._id}:`, error);
            } finally {
                session.endSession();
            }
        }
    }
    public async sendBookingReminders() {
        const oneHourFromNow = new Date(Date.now() + 60 * 60000);
        const windowStart = new Date(oneHourFromNow.getTime() - 10 * 60000);
        const windowEnd = new Date(oneHourFromNow.getTime() + 10 * 60000);

        const upcomingBookings = await Booking.find({
            status: BookingStatus.ACCEPTED,
            scheduledAt: { $gte: windowStart, $lte: windowEnd },
            "reminders.oneHourSent": { $ne: true }
        });

        for (const b of upcomingBookings) {
            this.sendStatusNotification(b, 'reminder_1h').catch(err =>
                console.log(`[CRON NOTIF ERROR] 1-hour reminder for ${b._id}:`, err)
            );

            // Update specific flag
            await Booking.updateOne(
                { _id: b._id },
                { $set: { "reminders.oneHourSent": true } }
            );
        }
    }




    // Private functions
    private calculateDeadline(scheduledAt: Date): Date {
        const now = new Date();
        const diffInHours = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        let minutesToAdd = diffInHours <= 2 ? 15 : diffInHours <= 24 ? 30 : diffInHours <= 48 ? 360 : 1440;
        return new Date(now.getTime() + minutesToAdd * 60000);
    }
    private async sendStatusNotification(
        booking: IBooking,
        action: "accept" | "decline" | "start" | "complete" | "reschedule" | "dispute" | "confirm" | "rate"
            | "expired" | "auto_start" | "cancel" | "reminder_1h" | "imminent_warning" | "auto_cancel",
        providerName?: string
    ) {
        try {
            const providerActions = ["accept", "decline", "start", "complete"];
            const consumerActions = ["reschedule", "dispute", "confirm", "rate"];
            const systemActions = ["expired", "auto_start", "auto_cancel"];

            const targets: Array<{ type: 'consumer' | 'provider', id: any }> = [];

            if (systemActions.includes(action) || action === 'cancel') {
                targets.push({ type: 'consumer', id: booking.consumerId });
                targets.push({ type: 'provider', id: booking.providerId });
            } else if (providerActions.includes(action)) {
                targets.push({ type: 'consumer', id: booking.consumerId });
            } else if (consumerActions.includes(action)) {
                targets.push({ type: 'provider', id: booking.providerId });
            }

            const getNotificationContent = (targetType: 'consumer' | 'provider') => {
                const contents: Record<string, { title: string, body: string }> = {
                    accept: {
                        title: "Provider Accepted! 💳",
                        body: `${providerName} accepted your booking. Tap to complete payment and confirm.`
                    },
                    decline: {
                        title: "Booking Declined ❌",
                        body: "The provider cannot fulfill your request."
                    },
                    dispute: {
                        title: "Dispute Raised ⚠️",
                        body: "A dispute has been opened for your booking."
                    },
                    complete: {
                        title: "Job Completed 🏁",
                        body: "Job marked as done. You have 2 hours to confirm or raise a dispute."
                    },
                    confirm: {
                        title: "Payment Released! 💰",
                        body: "The client confirmed the job. Funds have been moved to your wallet."
                    },
                    rate: {
                        title: "Rating Received! ⭐",
                        body: "You've received a new rating for your service."
                    },
                    start: {
                        title: "Job Started 🚀",
                        body: `Your ${booking.serviceName} service has officially begun.`
                    },
                    reschedule: {
                        title: "Reschedule Request 🕒",
                        body: "A new time has been requested for your booking."
                    },
                    cancel: {
                        title: "Booking Cancelled 🛑",
                        body: targetType === 'consumer'
                            ? "Your booking has been cancelled."
                            : "A booking has been cancelled by the client."
                    },
                    // New dedicated auto_cancel — different from manual cancel
                    auto_cancel: {
                        title: "Booking Auto-Cancelled ⏰",
                        body: targetType === 'consumer'
                            ? `Your booking for ${booking.serviceName} was cancelled because payment was not completed in time.`
                            : `A booking for ${booking.serviceName} was auto-cancelled — the client did not complete payment.`
                    },
                    auto_start: {
                        title: "Job Auto-Started 🚀",
                        body: targetType === 'provider'
                            ? `The timer for ${booking.serviceName} has started automatically. Please proceed with the service.`
                            : `Your ${booking.serviceName} service has officially begun.`
                    },
                    expired: {
                        title: "Request Expired ⏰",
                        body: targetType === 'provider'
                            ? "A booking request expired because it wasn't accepted in time."
                            : "Your booking request expired as it wasn't accepted in time."
                    },
                    reminder_1h: {
                        title: "Upcoming Booking 📅",
                        body: targetType === 'provider'
                            ? `Reminder: You have a ${booking.serviceName} booking in 1 hour. Get ready!`
                            : `Reminder: Your ${booking.serviceName} booking is in 1 hour.`
                    },
                    imminent_warning: {
                        title: "Are you there? ⏳",
                        body: targetType === 'provider'
                            ? `You're late for your ${booking.serviceName} appointment! Start now to avoid auto-start.`
                            : `Your provider is slightly behind schedule for ${booking.serviceName}. Hang tight!`
                    }
                };
                return contents[action];
            };

            await Promise.all(targets.map(target => {
                const content = getNotificationContent(target.type);
                if (!content) return Promise.resolve();

                const data: any = {
                    bookingId: booking._id.toString(),
                    screen: "BookingDetails",
                    action
                };

                if (action === "accept") {
                    data.type = "PAYMENT_REQUIRED";
                }

                return NotificationService.sendByProfile(
                    target.type,
                    target.id.toString(),
                    content.title,
                    content.body,
                    data
                );
            }));
        } catch (err) {
            console.error("Non-blocking Notification Error:", err);
        }
    }

}

export const BookingService = new BookingServiceClass();


