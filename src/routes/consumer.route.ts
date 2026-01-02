import { Router } from 'express';
import * as controller from '../controllers/consumer/consumer.controller';
import * as SearchController from '../controllers/consumer/search.controller';
import { AuthMiddleware } from '../middlewares';

export const consumerRoutes = Router();
const Middleware = new AuthMiddleware();



consumerRoutes.patch('/complete-profile', controller.completeProfile());

// you have to have profile before you can use this routes
consumerRoutes.use(Middleware.consumerMiddleware)
consumerRoutes.get('/me', controller.getProfile());

consumerRoutes.get('/search/providers', SearchController.searchNearbyProviders());
consumerRoutes.get('/providers/:providerId', controller.getProviderProfileForBooking());
