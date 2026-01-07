import { Router } from 'express';
import * as controller from '../controllers/booking.controller';
import { AuthMiddleware } from '../middlewares';

export const bookingRoutes = Router();
const authMiddleware = new AuthMiddleware();



bookingRoutes.get('', authMiddleware.authorizeRole("consumer"), controller.getConsumerBookings())
bookingRoutes.post('/request', authMiddleware.authorizeRole("consumer"), controller.bookProvider())