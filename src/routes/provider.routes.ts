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
providerRoutes.post('/change-email', controller.changeEmail());
providerRoutes.patch('/change-phone', controller.changeNumber());
providerRoutes.patch('/update-bio', controller.updateBio());



/**
 * Address Management
 */


/**
 * dashboard management
 */
providerRoutes.get('/dashboard-data', controller.getDashboardData())

// Toggle availability (Online/Offline)
providerRoutes.patch('/toggle-availability', controller.toggleAvailability());