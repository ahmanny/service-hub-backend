import { Router } from 'express';
import * as controller from '../controllers/consumer/consumer.controller';
import * as SearchController from '../controllers/consumer/search.controller';
import { AuthMiddleware } from '../middlewares';

export const consumerRoutes = Router();
const authMiddleware = new AuthMiddleware();

// Initial profile setup 
consumerRoutes.patch('/complete-profile',controller.completeProfile());

// Middleware: ensure user is logged in AND has a consumer profile context
consumerRoutes.use(authMiddleware.authorizeRole("consumer"));

consumerRoutes.get('/me', controller.getProfile());

/**
 * Personal Information Management
 */
consumerRoutes.patch('/update-name', controller.updateName());
consumerRoutes.post('/change-email', controller.changeEmail()); // Initiates link
consumerRoutes.patch('/change-phone', controller.changeNumber()); // Verifies OTP

/**
 * Address Management
 */
consumerRoutes.post('/address', controller.addAddress());
consumerRoutes.patch('/address/:addressId/default', controller.setAddressDefault());
consumerRoutes.delete('/address/:addressId', controller.deleteAddress());

/**
 * Search & Booking
 */
consumerRoutes.get('/search/providers', SearchController.searchNearbyProviders());
consumerRoutes.get('/providers/:providerId', controller.getProviderProfileForBooking());