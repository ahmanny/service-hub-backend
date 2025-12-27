import UnauthorizedAccessException from '../exceptions/UnauthorizedAccessException';
import MissingParameterException from '../exceptions/MissingParameterException';
import { Consumer, getConsumerById, getConsumerByUserId, updateConsumerById } from '../models/consumer.model';
import ResourceNotFoundException from '../exceptions/ResourceNotFoundException';
import { Types } from 'mongoose';
import { User } from '../models/user.model';
import { CreateProfilePayload, LocationTuple, SearchPayload } from '../types/consumer';
import MOCK_PROVIDERS from "../data/mockProviders.json";
import { getDistance } from 'geolib';
import { getDirections } from '../utils/routeDirection.utils';


class ConsumerServiceClass {
    constructor() {
        // super()
    }

    // complete profile after sucessfull otp verification
    public async fetchProfile(userId: string | Types.ObjectId) {
        const profile = await getConsumerByUserId(userId);

        return {
            hasProfile: Boolean(profile),
            profile: profile ?? null
        };
    }


    public async createProfile(payload: CreateProfilePayload) {
        const { userId, email, firstName, lastName } = payload;

        if (!userId || !firstName || !lastName) {
            throw new MissingParameterException("Please provide your details");
        }

        //  Check if User exists
        const user = await User.findById(userId);
        if (!user) {
            throw new ResourceNotFoundException("User not found");
        }

        // Update email if provided
        if (email) {
            user.email = email;
            user.isEmailVerified = false
            await user.save();
        }

        // Check if consumer profile already exists
        const existingProfile = await Consumer.findOne({ userId: user._id });
        if (existingProfile) {
            throw new ResourceNotFoundException("Profile already exists for this user");
        }

        // Create the consumer profile
        const newProfile = await Consumer.create({
            userId: user._id,
            firstName,
            lastName,
        });

        return {
            profile: newProfile,
        };
    }



}

export const ConsumerService = new ConsumerServiceClass();
