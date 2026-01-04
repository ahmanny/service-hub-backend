import { Router } from 'express';
import * as controller from '../controllers/booking.controller';
import { AuthMiddleware } from '../middlewares';

export const bookingRoutes = Router();
const Middleware = new AuthMiddleware();



bookingRoutes.get('', Middleware.consumerMiddleware, controller.getConsumerBookings())
bookingRoutes.post('/request', Middleware.consumerMiddleware, controller.bookProvider())