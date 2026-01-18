import MissingParameterException from "../../exceptions/MissingParameterException";
import UnauthorizedAccessException from "../../exceptions/UnauthorizedAccessException";
import { AuthService } from "../../services/auth.service";
import { ProviderService } from "../../services/provider.service";
import { uploadSingleToCloudinary } from "../../utils/cloudinary";
import { error_handler, ok_handler } from "../../utils/response_handler";
import { Request, RequestHandler, Response } from "express";


// get logged in consumer profile
export const getProfile = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const data = await ProviderService.fetchProfile(req.currentUser._id)
            ok_handler(res, "Completed", data)
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}

// complete profile for logged in provider
export const completeProfile = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) throw new UnauthorizedAccessException("Unauthorized");

            if (!req.appType && req.appType !== "provider") {
                throw new UnauthorizedAccessException("Unauthorized ");
            }



            const files = req.files as { [fieldname: string]: Express.Multer.File[] };

            // 1. STRICTOR VALIDATION: Ensure all required files exist
            if (!files?.profilePicture?.[0]) {
                throw new MissingParameterException("Profile picture is required.");
            }
            if (!files?.idImage?.[0]) {
                throw new MissingParameterException("Identification document image is required.");
            }
            if (!files?.selfieImage?.[0]) {
                throw new MissingParameterException("A verification selfie is required.");
            }

            // Upload Images to Cloudinary 
            const [profilePictureUrl, idUri, selfieUri] = await Promise.all([
                uploadSingleToCloudinary(
                    files.profilePicture[0].buffer,
                    'profiles',
                    `profile_${req.currentUser._id}`
                ),
                uploadSingleToCloudinary(
                    files.idImage[0].buffer,
                    'verification',
                    `id_${req.currentUser._id}`
                ),
                uploadSingleToCloudinary(
                    files.selfieImage[0].buffer,
                    'verification',
                    `selfie_${req.currentUser._id}`
                )
            ]);

            const body = typeof req.body.services === 'string'
                ? {
                    ...req.body,
                    services: JSON.parse(req.body.services),
                    availability: JSON.parse(req.body.availability),
                    shopAddress: JSON.parse(req.body.shopAddress),
                    serviceArea: JSON.parse(req.body.serviceArea),
                }
                : req.body;

            const payload = {
                ...body,
                userId: req.currentUser._id,
                profilePicture: profilePictureUrl,
                verification: {
                    idUri: idUri,
                    selfieUri: selfieUri
                }
            };

            const data = await ProviderService.createProfile(payload);
            ok_handler(res, "Profile Completed Successfully", data);
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}
