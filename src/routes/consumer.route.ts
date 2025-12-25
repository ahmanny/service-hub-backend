import { Router } from 'express';
import * as controller from '../controllers/consumer.controller';
import { ConsumerMiddleware } from '../middlewares';

export const consumerRoutes = Router();
const Middleware = new ConsumerMiddleware();



consumerRoutes.use(Middleware.validateToken)
consumerRoutes.get('/me', controller.getProfile());
consumerRoutes.patch('/complete-profile', controller.completeProfile());
// consumerRoutes.patch('/update', controller.updateUserController());
// user.post('/validate', controller.validate);
// user.post('/add-new-user/:id', controller.addNewUser())