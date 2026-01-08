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


class ConsumerServiceClass {
    constructor() {
        // super()
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
        console.log("Payload", payload)

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

        console.log("Fields", updateFields)

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

        // 1. Resolve Identity
        const profile = await Consumer.findById(consumerId);
        if (!profile) throw new ResourceNotFoundException("Consumer not found");

        const currentUser = await User.findById(profile.userId);
        if (!currentUser) throw new ResourceNotFoundException("User account not found");

        // 2. OTP Validation Logic
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

        // 3. Collision Check: Ensure number isn't taken by another consumer
        const collision = await User.findOne({
            consumerPhone: phone,
            _id: { $ne: currentUser._id }
        });

        if (collision) {
            throw new Exception("This phone number is already used by another consumer account.");
        }

        // 4. Update and Cleanup
        currentUser.consumerPhone = phone;
        await currentUser.save();
        await session.deleteOne();

        // 5. Return fresh profile data for frontend sync
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
     * Then initiates the sending of the verification link.
     */
    public async changeEmail(consumerId: string, payload: { email: string }) {
        const { email } = payload;

        if (!email) throw new Exception("New email is required");

        //Resolve Identity
        const profile = await Consumer.findById(consumerId);
        if (!profile) throw new ResourceNotFoundException("Consumer not found");

        const currentUser = await User.findById(profile.userId);
        if (!currentUser) throw new ResourceNotFoundException("User account not found");

        // Collision Check
        const collision = await User.findOne({
            consumerEmail: email,
            _id: { $ne: currentUser._id }
        });

        if (collision) {
            throw new Exception("This email is already associated with another consumer account.");
        }

        //  THE UPDATE: Store the new email but mark as unverified
        currentUser.consumerEmail = email;
        currentUser.isConsumerEmailVerified = false;
        await currentUser.save();

        //  Generate Verification Token for the link
        // The token now only needs the ID since the email is already in the DB
        const verificationToken = JwtService.sign({ id: currentUser._id }, 'access');

        //  Send Verification Email (Placeholder)
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

        /* TODO: Implement Mailer Service
           await EmailService.sendVerificationLink(email, verificationUrl);
        */

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
        // The token should contain { userId, newEmail }
        const decoded = JwtService.verify(token, 'access') as { id: string, newEmail: string };

        if (!decoded || !decoded.newEmail) {
            throw new Exception("Invalid or expired verification link.");
        }

        // Resolve the User
        const user = await User.findById(decoded.id);
        if (!user) throw new ResourceNotFoundException("User not found");

        // Final Collision Check (Just in case someone took the email while user was away)
        const collision = await User.findOne({
            consumerEmail: decoded.newEmail,
            _id: { $ne: user._id }
        });

        if (collision) {
            throw new Exception("This email is now taken by another account.");
        }

        // THE UPDATE: Commit the new email and set verified to true
        user.consumerEmail = decoded.newEmail;
        user.isConsumerEmailVerified = true;
        await user.save();

        // Fetch and return the updated profile for the frontend
        return await this.fetchProfile(user._id);
    }

    public async searchNearbyProviders(payload: SearchPayload) {
        const {
            serviceType,
            service,
            lat,
            lng,
            maxDist = 2000,
            locationType,
        } = payload;

        // build geo query 
        const geoQuery: any = {
            serviceType,
        };
        // Filter by specific service (services.value)
        if (service) {
            geoQuery["services.value"] = service;
        }

        // Home service only
        if (locationType === "home") {
            geoQuery.homeServiceAvailable = true;
        }

        // Optional future-safe filters (keep commented until needed)
        // geoQuery.isAvailable = true;
        // geoQuery.isVerified = true;

        //  geo search
        const providers = await Provider.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [lng, lat],
                    },
                    distanceField: "straightDistance",
                    // maxDistance: maxDist, // meters
                    spherical: true,
                    query: geoQuery,
                },
            },
            { $sort: { straightDistance: 1 } },
            { $limit: 3 }, // fetch 4 closest
        ]);
        // Enrich with time ,route distance and direction route
        const results = await Promise.all(
            providers.map(async (provider, index) => {
                try {
                    const direction = await getDirections(
                        [lng, lat],
                        provider.location.coordinates
                    );

                    const route = direction?.routes?.[0];
                    const selectedService = service
                        ? provider.services?.find(
                            (s: any) => s.value === service
                        )
                        : null;

                    return {
                        _id: provider._id,
                        firstName: provider.firstName,
                        serviceType: provider.serviceType,
                        availabilityMode: provider.availabilityMode,
                        price: selectedService?.price ?? null,
                        serviceName: selectedService?.name ?? null,
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
                    // console.log(error)
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

    public async fetchProviderProfileForBooking(providerId: string) {
        const provider = await Provider.findById(providerId).select(
            {
                homeServiceAvailable: 1,
                services: 1,
                shopAddress: 1
            }
        ).lean()
        // { userId: providerId, isAvailable: true },


        if (!provider) {
            throw new ResourceNotFoundException("Provider not available");
        }

        return { provider };
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
