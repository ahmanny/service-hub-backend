import { Request, RequestHandler, Response } from "express";
import { ProviderService } from "../../services/provider/provider.service";
import { error_handler, ok_handler } from "../../utils/response_handler";
import MissingParameterException from "../../exceptions/MissingParameterException";
import UnauthorizedAccessException from "../../exceptions/UnauthorizedAccessException";
import { CloudinaryService } from "../../services/cloudinary.service";

// --- SECTION 1: IDENTITY & PROFILE BASE ---

/**
 * Get logged in provider profile
 */
export const getProfile = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) throw new UnauthorizedAccessException("Unauthorized");
            const data = await ProviderService.fetchProfile(req.currentUser._id);
            ok_handler(res, "Profile fetched", data);
        } catch (error) {
            error_handler(error, req, res);
        }
    };
};

/**
 * Complete profile (Initial Onboarding)
 */
export const completeProfile = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) throw new UnauthorizedAccessException("Unauthorized");

            if (!req.appType && req.appType !== "provider") {
                throw new UnauthorizedAccessException("Unauthorized ");

            }

            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            if (!files?.profilePicture?.[0] || !files?.idImage?.[0] || !files?.selfieImage?.[0]) {
                throw new MissingParameterException("Missing required verification images.");
            }

            const [profileRes, idRes, selfieRes] = await Promise.all([
                CloudinaryService.uploadImage(
                    files.profilePicture[0].buffer,
                    'profiles',
                    `provider_profile_${req.currentUser._id}`
                ),
                CloudinaryService.uploadImage(
                    files.idImage[0].buffer,
                    'verification',
                    `provider_id_${req.currentUser._id}`
                ),
                CloudinaryService.uploadImage(
                    files.selfieImage[0].buffer,
                    'verification',
                    `provider_selfie_${req.currentUser._id}`
                )
            ]);

            const profilePictureUrl = profileRes.secure_url;
            const idUri = idRes.secure_url;
            const selfieUri = selfieRes.secure_url;

            const body = typeof req.body.services === 'string'
                ? {
                    ...req.body,
                    services: JSON.parse(req.body.services),
                    availability: JSON.parse(req.body.availability),
                    shopAddress: JSON.parse(req.body.shopAddress),
                    serviceArea: JSON.parse(req.body.serviceArea),
                }
                : req.body;

            const data = await ProviderService.createProfile({
                ...body,
                userId: req.currentUser._id,
                profilePicture: profilePictureUrl,
                verification: { idUri, selfieUri }
            });

            ok_handler(res, "Profile Completed Successfully", data);
        } catch (error) {
            error_handler(error, req, res);
        }
    };
};

// --- SECTION 2: SETTINGS UPDATES (NAME, PHOTO, BIO, CONTACT) ---

export const updateName = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.providerProfile) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const data = await ProviderService.updateName(req.providerProfile!._id.toString(), req.body);
            ok_handler(res, "Name updated successfully", data);
        } catch (error) { error_handler(error, req, res); }
    };
};

export const updateProfilePhoto = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) throw new UnauthorizedAccessException("Unauthorized");

            if (!req.providerProfile) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            const [profileRes] = await Promise.all([
                CloudinaryService.uploadImage(
                    files.profilePicture[0].buffer,
                    'profiles',
                    `provider_profile_${req.currentUser._id}`
                ),
            ])
            const profilePictureUrl = profileRes.secure_url;
            const data = await ProviderService.updateProfilePhoto({ profilePicture: profilePictureUrl, providerId: req.providerProfile!._id.toString() });
            ok_handler(res, "Photo updated successfully", data);
        } catch (error) { error_handler(error, req, res); }
    };
};

export const updateBio = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.providerProfile) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const data = await ProviderService.updateBio(req.providerProfile!._id.toString(), req.body);
            ok_handler(res, "Bio updated", data);
        } catch (error) { error_handler(error, req, res); }
    };
};

export const changeEmail = () => async (req: Request, res: Response) => {
    try {
        if (!req.providerProfile) {
            throw new UnauthorizedAccessException("Unauthorized");
        }
        const data = await ProviderService.changeEmail(req.providerProfile!._id.toString(), req.body);
        ok_handler(res, "Verification link sent", data);
    } catch (error) { error_handler(error, req, res); }
};

export const verifyEmailUpdate = () => async (req: Request, res: Response) => {
    try {
        const data = await ProviderService.verifyEmailUpdate(req.query.token as string);
        ok_handler(res, "Email verified", data);
    } catch (error) { error_handler(error, req, res); }
};

export const changeNumber = () => async (req: Request, res: Response) => {
    try {
        if (!req.providerProfile) {
            throw new UnauthorizedAccessException("Unauthorized");
        }
        const data = await ProviderService.changeNumber(req.providerProfile!._id.toString(), req.body);
        ok_handler(res, "Phone updated", data);
    } catch (error) { error_handler(error, req, res); }
};

// --- SECTION 3: LOGISTICS (GEOSPATIAL & DELIVERY) ---

export const updateDeliveryMode = () => async (req: Request, res: Response) => {
    try {
        if (!req.providerProfile) {
            throw new UnauthorizedAccessException("Unauthorized");
        }
        const data = await ProviderService.updateDeliveryMode(req.providerProfile!._id.toString(), req.body);
        ok_handler(res, "Delivery modes updated", data);
    } catch (error) { error_handler(error, req, res); }
};

export const updateShopLocation = () => async (req: Request, res: Response) => {
    try {
        if (!req.providerProfile) {
            throw new UnauthorizedAccessException("Unauthorized");
        }
        const data = await ProviderService.updateShopLocation(req.providerProfile!._id.toString(), req.body);
        ok_handler(res, "Shop address updated", data);
    } catch (error) { error_handler(error, req, res); }
};

export const updateServiceArea = () => async (req: Request, res: Response) => {
    try {
        if (!req.providerProfile) {
            throw new UnauthorizedAccessException("Unauthorized");
        }
        const data = await ProviderService.updateServiceArea(req.providerProfile!._id.toString(), req.body);
        ok_handler(res, "Service radius updated", data);
    } catch (error) { error_handler(error, req, res); }
};

// --- SECTION 4: OPERATIONS (DASHBOARD, AVAILABILITY, SERVICES) ---

export const getDashboardData = () => async (req: Request, res: Response) => {
    try {
        if (!req.providerProfile) {
            throw new UnauthorizedAccessException("Unauthorized");
        }
        const data = await ProviderService.fetchDashboardData(req.providerProfile!._id.toString());
        ok_handler(res, "Dashboard data loaded", data);
    } catch (error) { error_handler(error, req, res); }
};

export const toggleAvailability = () => async (req: Request, res: Response) => {
    try {
        if (!req.providerProfile) {
            throw new UnauthorizedAccessException("Unauthorized");
        }
        const data = await ProviderService.toggleAvailability(req.providerProfile!._id.toString());
        ok_handler(res, "Availability status toggled", data);
    } catch (error) { error_handler(error, req, res); }
};

export const updateAvailability = () => async (req: Request, res: Response) => {
    try {
        if (!req.providerProfile) {
            throw new UnauthorizedAccessException("Unauthorized");
        }
        const data = await ProviderService.updateAvailability(req.providerProfile!._id.toString(), req.body);
        ok_handler(res, "Weekly schedule updated", data);
    } catch (error) { error_handler(error, req, res); }
};

export const updateServices = () => async (req: Request, res: Response) => {
    try {
        if (!req.providerProfile) {
            throw new UnauthorizedAccessException("Unauthorized");
        }
        const data = await ProviderService.updateServices(req.providerProfile!._id.toString(), req.body);
        ok_handler(res, "Service list updated", data);
    } catch (error) { error_handler(error, req, res); }
};


export const updatePayoutDetails = () => async (req: Request, res: Response) => {
    try {
        if (!req.providerProfile) {
            throw new UnauthorizedAccessException("Unauthorized");
        }
        const data = await ProviderService.updatePayoutDetails(req.providerProfile!._id.toString(), req.body);
        ok_handler(res, "Payout details updated successfully", data);
    } catch (error) { error_handler(error, req, res); }
};