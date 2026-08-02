import { Router } from 'express';
import * as controller from '../controllers/consumer/consumer.controller';
import { AuthMiddleware } from '../middlewares';
import * as userController from '../controllers/user.controller';
import * as notificationController from '../controllers/notification.controller';

export const consumerRoutes = Router();
const authMiddleware = new AuthMiddleware();

// save token 
consumerRoutes.patch('/save-token', userController.savePushToken('consumer'));

// Initial profile setup 
consumerRoutes.patch('/complete-profile', controller.completeProfile());


// Middleware: ensure user is logged in AND has a consumer profile context
consumerRoutes.use(authMiddleware.authorizeRole("consumer"));

consumerRoutes.get('/me', controller.getProfile());

import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Personal Information Management
 */
consumerRoutes.patch('/update-name', controller.updateName());
consumerRoutes.post('/change-email', controller.changeEmail());
consumerRoutes.patch('/change-phone', controller.changeNumber());
consumerRoutes.patch('/update-profile-photo', upload.fields([
    { name: 'profilePicture', maxCount: 1 },
]), controller.updateProfilePhoto());

/**
 * Address Management
 */
consumerRoutes.post('/address', controller.addAddress());
consumerRoutes.patch('/address/:addressId', controller.updateAddress());
consumerRoutes.patch('/address/:addressId/default', controller.setAddressDefault());
consumerRoutes.delete('/address/:addressId', controller.deleteAddress());

/**
 * Search & Booking
 */
consumerRoutes.get('/providers/:providerId', controller.getProviderProfileForBooking());

/**
 * Favourites Management
 */
consumerRoutes.post('/favourites/:providerId', controller.toggleFavourite());
consumerRoutes.get('/favourites', controller.getFavourites());

/**
 * Notifications
 */
consumerRoutes.get('/notifications', notificationController.getConsumerNotifications());
consumerRoutes.get('/notifications/unread-count', notificationController.getConsumerUnreadCount());
consumerRoutes.patch('/notifications/:id/read', notificationController.markConsumerNotificationRead());
consumerRoutes.patch('/notifications/read-all', notificationController.markAllConsumerNotificationsRead());