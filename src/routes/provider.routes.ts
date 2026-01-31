import { Router } from 'express';
import * as controller from '../controllers/consumer/provider.controller';
import * as userController from '../controllers/user.controller';
import { AuthMiddleware } from '../middlewares';

export const providerRoutes = Router();
const authMiddleware = new AuthMiddleware();


// save provider tokens
providerRoutes.patch('/save-token', userController.savePushToken('provider'));


// Initial profile setup 
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

providerRoutes.patch(
    '/complete-profile',
    upload.fields([
        { name: 'profilePicture', maxCount: 1 },
        { name: 'idImage', maxCount: 1 },
        { name: 'selfieImage', maxCount: 1 }
    ]),
    controller.completeProfile()
);


// Middleware: ensure user is logged in AND has a provider profile context
providerRoutes.use(authMiddleware.authorizeRole("provider"));

providerRoutes.get('/me', controller.getProfile());

/**
 * Personal Information Management
 */
providerRoutes.patch('/update-name', controller.updateName());
providerRoutes.patch('/change-email', controller.changeEmail());
providerRoutes.get('/verify-email', controller.verifyEmailUpdate());
providerRoutes.patch('/change-phone', controller.changeNumber());
providerRoutes.patch('/update-bio', controller.updateBio());
providerRoutes.patch('/update-profile-photo', upload.fields([
    { name: 'profilePicture', maxCount: 1 },
]),
    controller.updateProfilePhoto());



/**
 * LOGISTICS (GEOSPATIAL & DELIVERY) 
*/
providerRoutes.patch('/update-delivery-mode', controller.updateDeliveryMode());
providerRoutes.patch('/update-shop-location', controller.updateShopLocation());
providerRoutes.patch('/update-service-area', controller.updateServiceArea());


/**
 * OPERATIONS (DASHBOARD, AVAILABILITY, SERVICES)
 */
providerRoutes.get('/dashboard-data', controller.getDashboardData())
providerRoutes.patch('/toggle-availability', controller.toggleAvailability());
providerRoutes.patch('/update-services', controller.updateServices());
providerRoutes.patch('/update-availability', controller.updateAvailability());
