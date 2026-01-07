import Exception from "../../exceptions/Exception";
import MissingParameterException from "../../exceptions/MissingParameterException";
import UnauthorizedAccessException from "../../exceptions/UnauthorizedAccessException";
import { Consumer } from "../../models/consumer.model";
import { AuthService } from "../../services/auth.service";
import { BookingService } from "../../services/booking.service";
import { ConsumerService } from "../../services/consumer.service";
import { error_handler, ok_handler } from "../../utils/response_handler";
import { Request, RequestHandler, Response } from "express";


// verify login/sign up otp controller for consummer
export const verifyOtp = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { tokens, hasProfile, profile } = await AuthService.verifyOtp({ appType: "consumer", ...req.body })
            const data = { tokens, hasProfile, profile }
            ok_handler(res, "otp Verified", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}
// get logged in consumer profile
export const getProfile = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const data = await ConsumerService.fetchProfile(req.currentUser._id)
            ok_handler(res, "Completed", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}
// complete profile for logged in consumer
export const completeProfile = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            if (!req.appType && req.appType !== "consumer") {
                throw new UnauthorizedAccessException("Unauthorized gome");
            }
            const data = await ConsumerService.createProfile({ userId: req.currentUser._id, ...req.body })
            ok_handler(res, "Completed", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}
// Add a new address to the consumer's address book
export const addAddress = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.consumerProfile) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const data = await ConsumerService.addAddress(req.consumerProfile._id.toString(), req.body);
            ok_handler(res, "Address added successfully", data);
        } catch (error) {
            error_handler(error, req, res);
        }
    };
};
// Delete an address from the consumer's profile
export const deleteAddress = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.consumerProfile) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const { addressId } = req.params;
            if (!addressId) {
                throw new MissingParameterException("Address ID is missing");
            }

            const data = await ConsumerService.deleteAddress(req.consumerProfile._id.toString(), addressId);
            ok_handler(res, "Address deleted successfully", data);
        } catch (error) {
            error_handler(error, req, res);
        }
    };
};
// Set a specific address as the default
export const setAddressDefault = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.consumerProfile) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const { addressId } = req.params;
            if (!addressId) {
                throw new MissingParameterException("Address ID is missing");
            }

            const data = await ConsumerService.makeAddressDefault(req.consumerProfile._id.toString(), addressId);
            ok_handler(res, "Default address updated", data);
        } catch (error) {
            error_handler(error, req, res);
        }
    };
};
// get a provider profile for booking
export const getProviderProfileForBooking = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const { providerId } = req.params
            if (!providerId) {
                throw new MissingParameterException("provider Id is missing")
            }
            const data = await ConsumerService.fetchProviderProfileForBooking(providerId)
            ok_handler(res, "successfull", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}

// Update the first and last name of the consumer
export const updateName = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.consumerProfile) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const data = await ConsumerService.updateName(
                req.consumerProfile._id.toString(),
                req.body
            );

            ok_handler(res, "Name updated successfully", data);
        } catch (error) {
            error_handler(error, req, res);
        }
    };
};

// Initiate email change (stores pending email and sends link)
export const changeEmail = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.consumerProfile) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const data = await ConsumerService.changeEmail(
                req.consumerProfile._id.toString(),
                req.body
            );

            ok_handler(res, "Verification link sent", data);
        } catch (error) {
            error_handler(error, req, res);
        }
    };
};

// Finalize email change (triggered by the link click)
export const verifyEmailUpdate = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { token } = req.query; // Usually passed as ?token=...
            if (!token) {
                throw new MissingParameterException("Verification token is missing");
            }

            const data = await ConsumerService.verifyEmailUpdate(token as string);
            ok_handler(res, "Email verified successfully", data);
        } catch (error) {
            error_handler(error, req, res);
        }
    };
};


// Update phone number using OTP verification
export const changeNumber = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.consumerProfile) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const data = await ConsumerService.changeNumber(
                req.consumerProfile._id.toString(),
                req.body
            );

            ok_handler(res, "Phone number updated successfully", data);
        } catch (error) {
            error_handler(error, req, res);
        }
    };
};


