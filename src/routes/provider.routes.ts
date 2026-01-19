import { Router } from 'express';
import * as controller from '../controllers/consumer/provider.controller';
import { AuthMiddleware } from '../middlewares';

export const providerRoutes = Router();
const authMiddleware = new AuthMiddleware();


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


/**
 * Address Management
 */


/**
 * dashboard management
 */

providerRoutes.get('/dashboard-data', controller.getDashboardData())

// Toggle availability (Online/Offline)
providerRoutes.patch('/toggle-availability', controller.toggleAvailability());


// providerRoutes.get('/search', controller.getProfile());
// providerRoutes.get('/me', controller.getProfile());
// providerRoutes.patch('/complete-profile', controller.completeProfile());
// providerRoutes.patch('/update', controller.updateUserController());
// user.post('/validate', controller.validate);
// user.post('/add-new-user/:id', controller.addNewUser())