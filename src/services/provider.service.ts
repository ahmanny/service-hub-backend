import { SearchPayload } from '../types/consumer';
import { getDirections } from '../utils/routeDirection.utils';
import { IProviderProfile, Provider } from '../models/provider.model';
import mongoose, { Types } from 'mongoose';
import { createProviderProfilePayload } from '../types/providers.types';
import Exception from '../exceptions/Exception';
import { User } from '../models/user.model';
import ResourceNotFoundException from '../exceptions/ResourceNotFoundException';
import { startOfDay, endOfDay } from "date-fns";
import { Booking } from '../models/booking.model';


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

        console.log(profile)

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
            status: "pending",
            isAvailable: false,
            rating: 0
        };

        await Provider.create(profileData);

        const profile = await this.fetchProfile(user._id)

        return { profile }
    }


    /**
     * get provider dashboard data
     */
    public async fetchDashboardData(providerId: string) {

        const profile = await Provider.findById(providerId);
        if (!profile) {
            throw new ResourceNotFoundException("Provider profile not found");
        }

        const today = new Date();
        const start = startOfDay(today);
        const end = endOfDay(today);

        // stats, upcoming and pending
        const [stats, upcoming, pendingList, pendingTotal, upcomingTotal] = await Promise.all([

            // Today's Stats (just Completed)
            Booking.aggregate([
                {
                    $match: {
                        providerId: new mongoose.Types.ObjectId(providerId),
                        status: 'completed',
                        updatedAt: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: null,
                        earnings: { $sum: "$price.total" },
                        count: { $sum: 1 }
                    }
                }
            ]),

            //  Upcoming Bookings (Accepted status, scheduled for future)
            Booking.find({ providerId, status: 'accepted', scheduledAt: { $gte: today } })
                .sort({ scheduledAt: 1 })
                .limit(5),

            // Pending Bookings (Limit 5) 
            Booking.find({ providerId, status: 'pending' })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate("consumerId", "firstName profilePicture"),

            //  Total Pending Count
            Booking.countDocuments({ providerId, status: 'pending' }),

            //  Total upcoming Count
            Booking.countDocuments({ providerId, status: 'accepted', scheduledAt: { $gte: today } })

        ])


        return {
            todayStats: {
                earnings: stats[0]?.earnings || 0,
                completedJobs: stats[0]?.count || 0
            },
            upcomingBookings: {
                total: upcomingTotal,
                list: upcoming.map(b => ({
                    id: b._id.toString(),
                    title: b.serviceName,
                    time: b.scheduledAt.toISOString(),
                }))
            },
            pendingBooking: {
                total: pendingTotal,
                list: pendingList.map(p => ({
                    _id: p._id.toString(),
                    serviceName: p.serviceName,
                    price: p.price.total,
                    scheduledAt: p.scheduledAt.toISOString(),
                    deadlineAt: p.deadlineAt?.toISOString() || "",
                    type: p.location.type,
                    status: p.status,
                    serviceType: p.serviceType,
                    consumer: p.consumerId
                }))
            }
        };

    }

    public async toggleAvailability(providerId: string) {
        const provider = await Provider.findById(providerId);
        if (!provider) {
            throw new ResourceNotFoundException("Provider profile not found");
        }

        provider.isAvailable = !provider.isAvailable;

        await provider.save();
        return {
            message: `You are now ${provider.isAvailable ? 'Online' : 'Offline'}`,
            isAvailable: provider.isAvailable
        }
    }

    /**
 * PRIVATE UTILS
 */
    private sanitizeProfile(profile: any) {
        if (!profile) return null;

        // Extract the populated User document
        const { userId, ...profileData } = profile;

        console.log(userId)

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