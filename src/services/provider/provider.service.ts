import { IAvailabilityDay, IPayoutDetails, IProviderProfile, Provider, Services } from '../../models/provider.model';
import mongoose, { Types } from 'mongoose';
import { createProviderProfilePayload } from '../../types/providers.types';
import Exception from '../../exceptions/Exception';
import { User } from '../../models/user.model';
import ResourceNotFoundException from '../../exceptions/ResourceNotFoundException';
import { startOfDay, endOfDay } from "date-fns";
import { Booking } from '../../models/booking.model';
import { OtpSession } from '../../models/otp.model';
import TooManyAttemptsException from '../../exceptions/TooManyAttemptsException';
import { BLOCK_DURATION_HOURS, MAX_VERIFY_ATTEMPTS } from '../../configs/otpPolicy';
import { hashOtp } from '../../utils/otp.utils';
import { JwtService } from '../jwt.service';
import MissingParameterException from '../../exceptions/MissingParameterException';
import BadRequestException from '../../exceptions/BadRequestException';
import { CloudinaryService } from '../cloudinary.service';
import { Wallet } from '../../models/wallet.model';
import { calculateWeightedRating } from '../../utils/ranking.utils';
import NotFoundException from '../../exceptions/NotFoundException';
import { PaymentService } from '../payment.service';


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
            .lean()

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


        availability.forEach(day => {
            if (!day.isClosed) {
                day.slots.forEach(slot => {
                    if (slot.start >= slot.end) {
                        throw new BadRequestException(`Invalid time slot for day ${day.dayOfWeek}: Start must be before End.`);
                    }
                });
            }
        });

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
                    city: shopAddress.city,
                    state: shopAddress.state,
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

        const providerProfileId = profile.profile?._id;

        if (!providerProfileId) {
            throw new Exception("Failed to create provider profile");
        }
        await Wallet.findOneAndUpdate(
            { providerId: providerProfileId },
            {
                $setOnInsert: {
                    providerId: providerProfileId,
                    availableBalance: 0,
                    pendingBalance: 0,
                    totalEarned: 0,
                    currency: "NGN"
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

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
 * Service Methods  account personal info management
*/

    public async updateProfilePhoto(payload: {
        providerId: string,
        profilePicture: string
    }) {
        const { providerId, profilePicture } = payload;

        const provider = await Provider.findById(providerId).select('profilePicture');

        if (!provider) {
            throw new ResourceNotFoundException("Provider profile not found");
        }

        const oldPhotoUrl = provider.profilePicture;

        provider.profilePicture = profilePicture;
        await provider.save();

        if (oldPhotoUrl && oldPhotoUrl !== profilePicture) {
            CloudinaryService.deleteImage(oldPhotoUrl).catch(err => console.error(err));
        }

        return {
            message: "Profile photo updated successfully",
            profilePicture: provider.profilePicture
        };
    }

    /**
     * Updates the names on profile.
     */
    public async updateName(providerId: string, payload: { firstName?: string; lastName?: string }) {
        const { firstName, lastName } = payload;
        if (!firstName && !lastName) {
            throw new MissingParameterException("Please provide at least one name to update");
        }

        const updatedProfile = await Provider.findByIdAndUpdate(
            providerId,
            {
                ...(firstName && { firstName }),
                ...(lastName && { lastName })
            },
            { new: true, runValidators: true }
        ).populate("userId", "consumerPhone consumerEmail");

        if (!updatedProfile) {
            throw new ResourceNotFoundException("Consumer profile not found");
        }

        return { message: "updated" };
    }

    // verify OTP and update provider phone (no token generation)
    public async changeNumber(providerId: string, payload: { phone: string, otp: string }) {
        const { phone, otp } = payload;

        if (!phone || !otp) throw new Exception("Phone and OTP are required");

        // Identity
        const profile = await Provider.findById(providerId);
        if (!profile) throw new ResourceNotFoundException("profile not found");

        const currentUser = await User.findById(profile.userId);
        if (!currentUser) throw new ResourceNotFoundException("User account not found");

        // OTP Validation
        const now = new Date();
        const session = await OtpSession.findOne({ phone });
        if (!session) throw new Exception("No OTP session found, please request a code");

        if (session.blockedUntil && session.blockedUntil > now) {
            throw new TooManyAttemptsException("Too many attempts. Try again later.");
        }
        if (session.expiresAt < now) throw new Exception("OTP expired.");

        if (session.verifyAttempts >= MAX_VERIFY_ATTEMPTS) {
            session.blockedUntil = new Date(now.getTime() + BLOCK_DURATION_HOURS * 60 * 60 * 1000);
            await session.save();
            throw new TooManyAttemptsException("Too many failed attempts.");
        }

        if (hashOtp(otp) !== session.otpHash) {
            session.verifyAttempts += 1;
            await session.save();
            throw new Exception("Invalid OTP.");
        }

        // number isn't taken by another account
        const collision = await User.findOne({
            providerPhone: phone,
            _id: { $ne: currentUser._id }
        });

        if (collision) {
            throw new Exception("This phone number is already used by another account.");
        }

        //Update and Cleanup
        currentUser.providerPhone = phone;
        await currentUser.save();
        await session.deleteOne();

        //  Return fresh profile data for sync
        const updatedData = await this.fetchProfile(currentUser._id);

        return updatedData; // Just return { hasProfile, profile }
    }

    /**
 * Then initiates the sending of the verification link.
 */
    public async changeEmail(providerId: string, payload: { email: string }) {
        const { email } = payload;

        if (!email) throw new Exception("New email is required");

        //Resolve Identity
        const profile = await Provider.findById(providerId);
        if (!profile) throw new ResourceNotFoundException("profile not found");

        const currentUser = await User.findById(profile.userId);
        if (!currentUser) throw new ResourceNotFoundException("User account not found");

        // Collision Check
        const collision = await User.findOne({
            providerEmail: email,
            _id: { $ne: currentUser._id }
        });

        if (collision) {
            throw new Exception("This email is already associated with another account.");
        }

        //  THE UPDATE: Store the new email but mark as unverified
        currentUser.providerEmail = email;
        currentUser.isProviderEmailVerified = false;
        await currentUser.save();

        //  Generate Verification Token for the link
        // The token now only needs the ID since the email is already in the DB
        const verificationToken = JwtService.sign(
            { id: currentUser._id, purpose: 'email_verification' },
            'verify'
        );

        //  Send Verification Email (Placeholder)
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

        /* TODO: Implement Mailer Service
           await EmailService.sendVerificationLink(email, verificationUrl);
        */

        console.log("VERIFICATION URL:", verificationUrl)

        return {
            message: "Email updated and verification link sent.",
            user: currentUser
        };
    }

    /**
     * Verifies the token from the email link and updates the database.
     */
    public async verifyEmailUpdate(token: string) {
        if (!token) throw new Exception("Verification token is required");

        //  Decode the token (Using your JwtService)
        const decoded = JwtService.verify(token, 'access') as { id: string, newEmail: string };

        if (!decoded || !decoded.newEmail) {
            throw new Exception("Invalid or expired verification link.");
        }

        // Resolve the User
        const user = await User.findById(decoded.id);
        if (!user) throw new ResourceNotFoundException("User not found");

        // Final Collision Check (Just in case someone took the email while user was away)
        const collision = await User.findOne({
            providerEmail: decoded.newEmail,
            _id: { $ne: user._id }
        });

        if (collision) {
            throw new Exception("This email is taken by another account.");
        }

        // THE UPDATE: Commit the new email and set verified to true
        user.providerEmail = decoded.newEmail;
        user.isProviderEmailVerified = true;
        await user.save();

        // Fetch and return the updated profile for the frontend
        return await this.fetchProfile(user._id);
    }

    public async updateBio(providerId: string, payload: { bio: string }) {
        const { bio } = payload;


        if (bio === undefined || bio === null) {
            throw new MissingParameterException("Bio content is required");
        }

        const cleanedBio = bio?.trim() || "";

        if (!cleanedBio && bio !== "") {
            throw new BadRequestException("Bio cannot consist only of spaces");
        }

        const MAX_LENGTH = 250;
        if (bio.length > MAX_LENGTH) {
            throw new BadRequestException(`Bio is too long. Maximum ${MAX_LENGTH} characters allowed.`);
        }

        const updatedProfile = await Provider.findByIdAndUpdate(
            providerId,
            { bio: cleanedBio },
            { new: true, runValidators: true }
        )

        if (!updatedProfile) {
            throw new ResourceNotFoundException("Provider profile not found");
        }

        return {
            message: "Bio updated successfully",
        };
    }

    /**
     * Updates the list of services offered by the provider.
     * Automatically syncs the basePriceFrom to the cheapest service.
     */
    public async updateServices(providerId: string, payload: Services[]) {

        if (!payload || !Array.isArray(payload)) {
            throw new BadRequestException("Services must be an array");
        }

        if (payload.length === 0) {
            throw new BadRequestException("You must offer at least one service");
        }

        const cleanedServices = payload.map(service => ({
            name: service.name.trim(),
            value: service.value.trim().toLowerCase(),
            price: Math.max(0, service.price)
        }));

        // Calculate the new 'basePriceFrom'
        const minPrice = Math.min(...cleanedServices.map(s => s.price));


        //  Update the Profile
        const updatedProfile = await Provider.findByIdAndUpdate(
            providerId,
            {
                services: cleanedServices,
                basePriceFrom: minPrice
            },
            { new: true, runValidators: true }
        );

        if (!updatedProfile) {
            throw new ResourceNotFoundException("Provider profile not found");
        }

        return {
            message: "Services updated successfully",
        }
    }


    /**
    *  update delivery mode
    */
    public async updateDeliveryMode(providerId: string, payload: {
        offersHomeService: boolean;
        offersShopVisit: boolean;
    }) {
        const { offersHomeService, offersShopVisit } = payload;

        if (!offersHomeService && !offersShopVisit) {
            throw new BadRequestException("You must offer at least one delivery mode (Home Service or Shop Visit).");
        }

        const updatedProfile = await Provider.findByIdAndUpdate(
            providerId,
            {
                homeServiceAvailable: offersHomeService,
                offersShopVisit
            },
            { new: true, runValidators: true }
        );

        if (!updatedProfile) throw new ResourceNotFoundException("Provider profile not found");

        return { message: "Delivery modes updated successfully" };
    }


    /**
     *  update shop location
     *  If they update the address, they likely want to ensure shop visits are ON
     */
    public async updateShopLocation(providerId: string, payload: {
        shopAddress: {
            label: string;
            formattedAddress: string;
            city?: string;
            state?: string;
            latitude: number;
            longitude: number;
        };
        offersShopVisit?: boolean;
    }) {
        const { shopAddress, offersShopVisit } = payload;

        const updatedProfile = await Provider.findByIdAndUpdate(
            providerId,
            {
                shopAddress: {
                    address: shopAddress.formattedAddress,
                    city: shopAddress.city,
                    state: shopAddress.state,
                    location: {
                        type: 'Point',
                        coordinates: [shopAddress.longitude, shopAddress.latitude]
                    }
                },
                ...(offersShopVisit !== undefined && { offersShopVisit })
            },
            { new: true, runValidators: true }
        );

        if (!updatedProfile) throw new ResourceNotFoundException("Provider profile not found");

        return { message: "Shop location updated" };
    }


    /**
     *  update service rendering area
     */
    public async updateServiceArea(providerId: string, payload: {
        serviceArea: {
            formattedAddress: string;
            center: { latitude: number; longitude: number };
        };
        radiusKm: number;
    }) {
        const { serviceArea, radiusKm } = payload;

        const updatedProfile = await Provider.findByIdAndUpdate(
            providerId,
            {
                serviceArea: {
                    address: serviceArea.formattedAddress,
                    location: {
                        type: 'Point',
                        coordinates: [serviceArea.center.longitude, serviceArea.center.latitude]
                    },
                    radiusKm: radiusKm
                },
                homeServiceAvailable: true
            },
            { new: true, runValidators: true }
        );

        if (!updatedProfile) throw new ResourceNotFoundException("Provider profile not found");

        return { message: "Service area and radius updated" };
    }

    /**
    * update  availaibility
    */
    public async updateAvailability(providerId: string, payload: {
        availability: IAvailabilityDay[],
        avgServiceTime: number
    }) {
        const { availability, avgServiceTime } = payload;

        availability.forEach(day => {
            if (!day.isClosed) {
                day.slots.forEach(slot => {
                    if (slot.start >= slot.end) {
                        throw new BadRequestException(`Invalid time slot for day ${day.dayOfWeek}: Start must be before End.`);
                    }
                });
            }
        });

        const updatedProfile = await Provider.findByIdAndUpdate(
            providerId,
            {
                availability,
                avgServiceTime
            },
            { new: true, runValidators: true }
        );

        if (!updatedProfile) throw new ResourceNotFoundException("Provider profile not found");

        return { message: "Availability schedule updated" };
    }


    /**
 * Updates the bank payout details for the provider.
 */
    public async updatePayoutDetails(providerId: string, payload: IPayoutDetails) {
        const { bankCode, bankName, bankSlug, accountNumber, accountName } = payload;

        if (!bankCode || !bankName || !bankSlug || !accountNumber || !accountName) {
            throw new MissingParameterException("All bank account details are required for payout setup.");
        }

        const recipientData = await PaymentService.createTransferRecipient(
            accountName,
            accountNumber,
            bankCode
        );

        const paystackRecipientCode = recipientData.recipient_code;

        const updatedProfile = await Provider.findByIdAndUpdate(
            providerId,
            {
                payoutDetails: {
                    bankCode,
                    bankName,
                    bankSlug,
                    accountNumber,
                    accountName,
                    verifiedAt: new Date()
                },
                paystackRecipientCode
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedProfile) {
            throw new ResourceNotFoundException("Provider profile not found");
        }

        return {
            message: "Payout details updated successfully",
        };
    }


    // This method is called after a new rating is created to update the provider's aggregate rating stats.

    public async updateProviderRatingStats(
        providerId: string,
        newStars: number,
        session?: any
    ) {
        const provider = await Provider.findOne({ _id: providerId }).session(session);

        if (!provider) {
            throw new NotFoundException(`Provider with ID ${providerId} not found`);
        }

        console.log(`Updating rating stats for provider ${providerId}: +${newStars} stars`);

        // Update Raw Stats
        provider.totalStars = (provider.totalStars || 0) + newStars;
        provider.reviewCount = (provider.reviewCount || 0) + 1;

        // R = Raw Average
        const rawAverage = provider.totalStars / provider.reviewCount;
        provider.rating = parseFloat(rawAverage.toFixed(2));

        // Calculate Weighted Rating (The Weapon)
        provider.weightedRating = calculateWeightedRating(
            provider.reviewCount,
            provider.rating
        );

        await provider.save({ session });
    }





    /**
 * PRIVATE UTILS
 */
    private sanitizeProfile(profile: any) {
        if (!profile) return null;

        // Extract the populated User document
        const { userId, ...profileData } = profile;

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