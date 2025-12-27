import { Router } from 'express';
import * as controller from '../controllers/consumer.controller';
import * as SearchController from '../controllers/search.controller';
import { AuthMiddleware } from '../middlewares';

export const consumerRoutes = Router();
const Middleware = new AuthMiddleware();



// consumerRoutes.use(Middleware.validateToken)
consumerRoutes.get('/me', controller.getProfile());
consumerRoutes.patch('/complete-profile', controller.completeProfile());



// search providers
consumerRoutes.get('/search/providers', SearchController.searchNearbyProviders());
// consumerRoutes.patch('/update', controller.updateUserController());
// user.post('/validate', controller.validate);
// user.post('/add-new-user/:id', controller.addNewUser())