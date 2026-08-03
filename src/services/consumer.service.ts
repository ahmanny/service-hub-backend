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
import { OtpSession } from '../models/otp.model';
import TooManyAttemptsException from '../exceptions/TooManyAttemptsException';
import { BLOCK_DURATION_HOURS, MAX_VERIFY_ATTEMPTS } from '../configs/otpPolicy';
import { hashOtp } from '../utils/otp.utils';
import { JwtService } from './jwt.service';
import { EmailService } from './email.service';
import { ServiceType } from '../types/service.types';
import { ProviderListItem } from '../types/providers.types';
import { Booking } from '../models/booking.model';
import { CloudinaryService } from './cloudinary.service';


class ConsumerServiceClass {
    constructor() {
        // super()
    }

    public async updateProfilePhoto(payload: {
        consumerId: string,
        profilePicture: string
    }) {
        const { consumerId, profilePicture } = payload;

        const consumer = await Consumer.findById(consumerId).select('profilePicture userId');

        if (!consumer) {
            throw new ResourceNotFoundException("Consumer profile not found");
        }

        const oldPhotoUrl = consumer.profilePicture;

        consumer.profilePicture = profilePicture;
        consumer.avatarUrl = profilePicture;
        await consumer.save();

        if (consumer.userId) {
            await User.findByIdAndUpdate(consumer.userId, { profilePicture });
        }

        if (oldPhotoUrl && oldPhotoUrl !== profilePicture) {
            CloudinaryService.deleteImage(oldPhotoUrl).catch(err => console.error(err));
        }

        return {
            message: "Profile photo updated successfully",
            profilePicture: consumer.profilePicture
        };
    }

    // complete profile after sucessfull otp verification
    public async fetchProfile(userId: string | Types.ObjectId) {
        const profile = await Consumer.findOne({ userId })
            .populate({
                path: "userId",
                // Select only consumer-related fields and common fields
                select: "consumerEmail consumerPhone isConsumerEmailVerified activeRoles createdAt",
            })
            .lean({ virtuals: true });

        return {
            hasProfile: Boolean(profile),
            profile: profile ? this.sanitizeProfile(profile) : null
        };
    }

    public async createProfile(payload: CreateProfilePayload) {
        const { userId, email, firstName, lastName } = payload;

        // Validation
        if (!userId || !firstName || !lastName) {
            throw new MissingParameterException("Please provide your details");
        }

        // Check if User Identity exists
        const user = await User.findById(userId);
        if (!user) {
            throw new ResourceNotFoundException("User identity not found");
        }

        // Update Consumer-specific email if provided
        if (email) {
            // Ensure this email isn't already taken as a consumerEmail by another user
            const emailExists = await User.findOne({
                consumerEmail: email,
                _id: { $ne: user._id }
            });

            if (emailExists) {
                throw new Exception("This email is already associated with another consumer account");
            }
            console.log(email)
            user.consumerEmail = email;
            user.isConsumerEmailVerified = false;
        }

        // Update Active Roles tracking
        if (!user.activeRoles.includes('consumer')) {
            user.activeRoles.push('consumer');
        }

        await user.save();

        // Check if consumer persona profile already exists
        const existingProfile = await Consumer.findOne({ userId: user._id });
        if (existingProfile) {
            // It's safer to return a specific error here so the frontend knows to redirect to Home
            throw new Exception("Consumer profile already exists for this user");
        }

        // Create the persona-specific consumer profile
        const newProfile = await Consumer.create({
            userId: user._id,
            firstName,
            lastName,
        });

        //  Return populated data
        const profile = await this.fetchProfile(user._id)
        return { profile }
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

        const addressData: IConsumerAddress = {
            label,
            formattedAddress,
            location: {
                type: 'Point',
                coordinates: [longitude, latitude],
            },
            isDefault: isFirstAddress
        };

        const updatedConsumer = await addAddressToConsumer(consumerId, addressData);

        if (!updatedConsumer) {
            throw new Exception("Error Addings Address");
        }

        return { updatedConsumer };
    }

    // update address 
    public async updateAddress(
        payload: {
            consumerId: string,
            addressId: string,
            update: Partial<{
                label: string;
                formattedAddress: string;
                latitude: number;
                longitude: number;
            }>
        }
    ) {
        const { update, addressId, consumerId } = payload
        const { label, formattedAddress, latitude, longitude } = update;
        

        // Build the update object dynamically for the specific array element
        const updateFields: any = {};
        if (label) updateFields["addresses.$.label"] = label;
        if (formattedAddress) updateFields["addresses.$.formattedAddress"] = formattedAddress;
        if (latitude !== undefined && longitude !== undefined) {
            updateFields["addresses.$.location"] = {
                type: "Point",
                coordinates: [longitude, latitude], // Remember: [lng, lat]
            };
        }

        

        const updatedConsumer = await Consumer.findOneAndUpdate(
            { _id: consumerId, "addresses._id": addressId },
            { $set: updateFields },
            { new: true, runValidators: true }
        ).lean();

        if (!updatedConsumer) {
            throw new ResourceNotFoundException("Address or Consumer not found");
        }

        // Reuse your existing fetchProfile logic to return sanitized data
        return await this.fetchProfile(updatedConsumer.userId);
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

    /**
     * Service Methods for Consumer account personal info management
    */
    // verify OTP and update consumer phone (no token generation)
    public async changeNumber(consumerId: string, payload: { phone: string, otp: string }) {
        const { phone, otp } = payload;

        if (!phone || !otp) throw new Exception("Phone and OTP are required");

        //Resolve Identity
        const profile = await Consumer.findById(consumerId);
        if (!profile) throw new ResourceNotFoundException("profile not found");

        const currentUser = await User.findById(profile.userId);
        if (!currentUser) throw new ResourceNotFoundException("User account not found");

        //  Validation
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

        //  number isn't taken by another consumer
        const collision = await User.findOne({
            consumerPhone: phone,
            _id: { $ne: currentUser._id }
        });

        if (collision) {
            throw new Exception("This phone number is already used by another consumer account.");
        }

        // Update and Cleanup
        currentUser.consumerPhone = phone;
        await currentUser.save();
        await session.deleteOne();

        //  Return fresh profile data for sync
        const updatedData = await this.fetchProfile(currentUser._id);

        return updatedData; // Just return { hasProfile, profile }
    }
    /**
     * Updates the names on the Consumer profile.
     */
    public async updateName(consumerId: string, payload: { firstName?: string; lastName?: string }) {
        const { firstName, lastName } = payload;
        if (!firstName && !lastName) {
            throw new MissingParameterException("Please provide at least one name to update");
        }

        const updatedProfile = await Consumer.findByIdAndUpdate(
            consumerId,
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

    /**
     * Sends a 6-digit OTP code & 1-click link to the consumer's email address.
     */
    public async sendConsumerEmailOtp(consumerId: string, payload?: { email?: string }) {
        const profile = await Consumer.findById(consumerId);
        if (!profile) throw new ResourceNotFoundException("Consumer profile not found");

        const currentUser = await User.findById(profile.userId);
        if (!currentUser) throw new ResourceNotFoundException("User account not found");

        const targetEmail = payload?.email?.trim().toLowerCase() || currentUser.consumerEmail;
        if (!targetEmail) {
            throw new Exception("Please provide an email address to verify");
        }

        // Collision Check if updating email
        if (payload?.email && payload.email !== currentUser.consumerEmail) {
            const collision = await User.findOne({
                consumerEmail: targetEmail,
                _id: { $ne: currentUser._id }
            });
            if (collision) {
                throw new Exception("This email is already associated with another account.");
            }
            currentUser.consumerEmail = targetEmail;
            currentUser.isConsumerEmailVerified = false;
        }

        // Generate 6-digit OTP Code & Expiration
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = hashOtp(otpCode);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        currentUser.consumerEmailOtpHash = otpHash;
        currentUser.consumerEmailOtpExpiresAt = expiresAt;
        await currentUser.save();

        // 1-Click Verification Link
        const verificationToken = JwtService.sign({ id: currentUser._id }, 'access');
        const verificationUrl = `${process.env.FRONTEND_URL || 'https://proxxi.app'}/v1/consumer/verify-email?token=${verificationToken}`;

        console.log(`✉️ [CONSUMER EMAIL VERIFICATION] Target: ${targetEmail} | OTP Code: ${otpCode} | 1-Click URL: ${verificationUrl}`);

        // Dispatch Email via Mailjet
        await EmailService.sendVerificationOtpEmail({
            email: targetEmail,
            otpCode,
            verificationUrl,
            name: profile.firstName ? `${profile.firstName} ${profile.lastName}`.trim() : undefined,
        });

        return {
            message: `Verification code & link sent to ${targetEmail}`,
            email: targetEmail,
            otpCode, // Included for dev testing
            expiresAt
        };
    }

    /**
     * Verifies the 6-digit in-app OTP code.
     */
    public async verifyConsumerEmailOtp(consumerId: string, payload: { otp: string }) {
        const { otp } = payload;
        if (!otp || otp.length !== 6) {
            throw new Exception("Please enter a valid 6-digit verification code");
        }

        const profile = await Consumer.findById(consumerId);
        if (!profile) throw new ResourceNotFoundException("Consumer profile not found");

        const currentUser = await User.findById(profile.userId);
        if (!currentUser) throw new ResourceNotFoundException("User account not found");

        if (!currentUser.consumerEmailOtpHash || !currentUser.consumerEmailOtpExpiresAt) {
            throw new Exception("No active verification code found. Please request a new code.");
        }

        if (new Date() > new Date(currentUser.consumerEmailOtpExpiresAt)) {
            throw new Exception("Verification code has expired. Please request a new code.");
        }

        const inputHash = hashOtp(otp);
        if (inputHash !== currentUser.consumerEmailOtpHash) {
            throw new Exception("Invalid verification code. Please check and try again.");
        }

        // Success: Mark as verified and clear OTP
        currentUser.isConsumerEmailVerified = true;
        currentUser.consumerEmailOtpHash = undefined;
        currentUser.consumerEmailOtpExpiresAt = undefined;
        await currentUser.save();

        return await this.fetchProfile(currentUser._id);
    }

    public async changeEmail(consumerId: string, payload: { email: string }) {
        return await this.sendConsumerEmailOtp(consumerId, payload);
    }

    /**
     * Verifies the 1-click token from the email link.
     */
    public async verifyEmailUpdate(token: string) {
        if (!token) throw new Exception("Verification token is required");

        const decoded = JwtService.verify(token, 'access') as { id: string };
        if (!decoded || !decoded.id) {
            throw new Exception("Invalid or expired verification link.");
        }

        const user = await User.findById(decoded.id);
        if (!user) throw new ResourceNotFoundException("User account not found");

        user.isConsumerEmailVerified = true;
        user.consumerEmailOtpHash = undefined;
        user.consumerEmailOtpExpiresAt = undefined;
        await user.save();

        return await this.fetchProfile(user._id);
    }

    public async fetchProviderProfileForBooking(providerId: string) {
        // Fetch provider with all fields defined in your IProviderProfile
        const provider = await Provider.findById(providerId).lean();
        // .populate("userId", "consumerPhone consumerEmail") // If you need to contact the provider


        if (!provider) {
            throw new ResourceNotFoundException("Provider not available");
        }
        const activeBookings = await Booking.find({
            providerId: provider._id,
            status: { $in: ["pending", "confirmed"] },
            scheduledAt: { $gte: new Date() }
        }).select("scheduledAt").lean();

        const bookedSlots = activeBookings.map(b => {
            const d = new Date(b.scheduledAt);

            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');

            return {
                date: `${year}-${month}-${day}`, // Format: YYYY-MM-DD (local)
                startTime: `${d.getHours().toString().padStart(2, '0')}:00` // local hour
            };
        });

        return {
            provider: { ...provider, bookedSlots, isTopRated: provider.weightedRating > 4.5 }
        };
    }

    public async toggleFavourite(consumerId: string, providerId: string) {
        const consumer = await Consumer.findById(consumerId);
        if (!consumer) {
            throw new ResourceNotFoundException("Consumer profile not found");
        }

        const providerObjectId = new Types.ObjectId(providerId);
        const favourites = consumer.favourites || [];
        const isFavourited = favourites.some(id => id.toString() === providerId);

        let updatedConsumer;
        if (isFavourited) {
            updatedConsumer = await Consumer.findByIdAndUpdate(
                consumerId,
                { $pull: { favourites: providerObjectId } },
                { new: true }
            );
        } else {
            updatedConsumer = await Consumer.findByIdAndUpdate(
                consumerId,
                { $addToSet: { favourites: providerObjectId } },
                { new: true }
            );
        }

        const newIsFavourited = !isFavourited;
        return {
            isFavourited: newIsFavourited,
            favourites: updatedConsumer?.favourites || [],
            message: newIsFavourited ? "Provider added to favourites" : "Provider removed from favourites"
        };
    }

    public async getFavourites(consumerId: string) {
        const consumer = await Consumer.findById(consumerId).populate({
            path: "favourites",
            select: "firstName profilePicture serviceType rating reviewCount services shopAddress basePriceFrom weightedRating",
        });

        if (!consumer) {
            throw new ResourceNotFoundException("Consumer profile not found");
        }

        const favourites = (consumer.favourites || []).map((provider: any) => ({
            _id: provider._id.toString(),
            firstName: provider.firstName,
            profilePicture: provider.profilePicture || null,
            serviceType: provider.serviceType,
            rating: provider.rating || 5.0,
            reviewCount: provider.reviewCount || 0,
            services: provider.services || [],
            shopAddress: provider.shopAddress || null,
            basePriceFrom: provider.basePriceFrom || 0,
            isTopRated: (provider.weightedRating || 0) > 4.5,
        }));

        return favourites;
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
                phone: userId?.consumerPhone,
                email: userId?.consumerEmail,
                isEmailVerified: userId?.isConsumerEmailVerified,
                activeRoles: userId?.activeRoles,
                createdAt: userId?.createdAt
            }
        };
    }
}

export const ConsumerService = new ConsumerServiceClass();
