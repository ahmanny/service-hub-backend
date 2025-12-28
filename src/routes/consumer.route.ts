import { Router } from 'express';
import * as controller from '../controllers/consumer/consumer.controller';
import * as SearchController from '../controllers/consumer/search.controller';
import { AuthMiddleware } from '../middlewares';

export const consumerRoutes = Router();
const Middleware = new AuthMiddleware();



consumerRoutes.use(Middleware.validateToken)
consumerRoutes.get('/me', controller.getProfile());
consumerRoutes.patch('/complete-profile', controller.completeProfile());

// fetch a providers profile for booking
consumerRoutes.get('/providers/:providerId', controller.getProviderProfileForBooking());

// search providers
consumerRoutes.get('/search/providers', SearchController.searchNearbyProviders());
// consumerRoutes.patch('/update', controller.updateUserController());
// user.post('/validate', controller.validate);
// user.post('/add-new-user/:id', controller.addNewUser())