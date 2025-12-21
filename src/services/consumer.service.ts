import UnauthorizedAccessException from '../exceptions/UnauthorizedAccessException';
import MissingParameterException from '../exceptions/MissingParameterException';
import { updateConsumerById } from '../models/consumer.model';
import ResourceNotFoundException from '../exceptions/ResourceNotFoundException';

class ConsumerServiceClass {
    constructor() {
        // super()
    }

    // complete profile after sucessfull otp verification
    public async completeProfile(payload: { userid: string, email: string, firstName: string, lastName: string }) {
        const { email, firstName, lastName, userid } = payload
        if (!userid) {
            throw new UnauthorizedAccessException("Unthorized")
        }
        if (!email || !firstName || !lastName) {
            throw new MissingParameterException("Please provide your details")
        }
        // Update the user
        const updatedUser = await updateConsumerById(
            userid,
            {
                email,
                firstName,
                lastName,
                profileCompleted: true, // mark profile as completed
            },
        ).lean();

        if (!updatedUser) {
            throw new ResourceNotFoundException("User not found")
        }

        return {
            user: updatedUser
        }
    }
}

export const ConsumerService = new ConsumerServiceClass();
