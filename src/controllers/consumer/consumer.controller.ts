import Exception from "../../exceptions/Exception";
import MissingParameterException from "../../exceptions/MissingParameterException";
import UnauthorizedAccessException from "../../exceptions/UnauthorizedAccessException";
import { Consumer } from "../../models/consumer.model";
import { AuthService } from "../../services/auth.service";
import { ConsumerService } from "../../services/consumer.service";
import { error_handler, ok_handler } from "../../utils/response_handler";
import { Request, RequestHandler, Response } from "express";


// verify login/sign up otp controller for consummer
export const verifyOtp = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { tokens, user } = await AuthService.verifyOtp(req.body)
            const { hasProfile, profile } = await ConsumerService.fetchProfile(user._id)
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
            console.log("Controller:", req.currentUser)
            const data = await ConsumerService.createProfile({ userId: req.currentUser._id, ...req.body })
            ok_handler(res, "Completed", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}


// get a provider profile for booking
export const getProviderProfileForBooking = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            // if (!req.currentUser) {
            //     throw new UnauthorizedAccessException("Unauthorized");
            // }
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





















// export const updateUserController = (): RequestHandler => {
//     return async (req: Request, res: Response): Promise<void> => {
//         try {
//             if (!req.consumer) {
//                 throw new UnauthorizedAccessException("Unauthorized");
//             }

//             // Allowed fields for updating
//             const allowedFields = [
//                 "firstname",
//                 "lastname",
//                 "avatarUrl",
//                 "username"
//             ];

//             const updates: Record<string, any> = {};

//             // Only copy allowed fields from req.body
//             for (const field of allowedFields) {
//                 if (req.body[field] !== undefined) {
//                     updates[field] = req.body[field];
//                 }
//             }

//             const updatedUser = await Consumer.findByIdAndUpdate(
//                 req.consumer._id,
//                 { $set: updates },
//                 { new: true }
//             ).select("-password");

//             if (!updatedUser) {
//                 throw new Exception("No changes were made");
//             }

//             ok_handler(res, "User updated successfully");

//         } catch (error) {
//             error_handler(error, req, res);
//         }
//     };
// };
