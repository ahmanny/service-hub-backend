import { Router } from 'express';
import * as controller from '../controllers/booking.controller';
import * as paymentController from '../controllers/payment.controller';
import { AuthMiddleware } from '../middlewares';

export const bookingRoutes = Router();
const authMiddleware = new AuthMiddleware();



bookingRoutes.get('/unrated-pending', authMiddleware.authorizeRole("consumer"), controller.getUnratedPendingBooking());
bookingRoutes.put('/:bookingId/dismiss-rating', authMiddleware.authorizeRole("consumer"), controller.dismissRatingPrompt());

bookingRoutes.get('',
    authMiddleware.authorizeRole(["consumer", "provider"]),
    controller.getBookings());
bookingRoutes.post('/request', authMiddleware.authorizeRole("consumer"), controller.bookProvider())
bookingRoutes.get('/:bookingId', authMiddleware.authorizeRole(["consumer", "provider"]), controller.getBookingDetails());
bookingRoutes.patch('/:bookingId/action', authMiddleware.authorizeRole(["consumer", "provider"]), controller.handleBookingAction());
bookingRoutes.get('/:bookingId/reschedule-data', authMiddleware.authorizeRole("consumer"), controller.getRescheduleSchedule());

bookingRoutes.post(
    "/:bookingId/pay",
    authMiddleware.authorizeRole("consumer"),
    paymentController.initializePayment()
);