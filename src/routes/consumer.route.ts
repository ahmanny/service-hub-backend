import { Router } from 'express';
import * as controller from '../controllers/consumer/consumer.controller';
import * as SearchController from '../controllers/consumer/search.controller';
import { AuthMiddleware } from '../middlewares';

export const consumerRoutes = Router();
const Middleware = new AuthMiddleware();



// Initial profile setup
consumerRoutes.patch('/complete-profile', controller.completeProfile());

// Middleware: ensure user has a consumer profile before accessing these
consumerRoutes.use(Middleware.consumerMiddleware);

consumerRoutes.get('/me', controller.getProfile());

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
