import { Router } from 'express';
import * as SearchController from '../controllers/search.controller';
import { AuthMiddleware } from '../middlewares';

export const providerRoutes = Router();
const authMiddleware = new AuthMiddleware();



providerRoutes.use(authMiddleware.validateToken)
// providerRoutes.get('/search', controller.getProfile());
// providerRoutes.get('/me', controller.getProfile());
// providerRoutes.patch('/complete-profile', controller.completeProfile());
// providerRoutes.patch('/update', controller.updateUserController());
// user.post('/validate', controller.validate);
// user.post('/add-new-user/:id', controller.addNewUser())