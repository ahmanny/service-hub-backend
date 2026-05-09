import { Request, RequestHandler, Response } from "express";
import { error_handler, ok_handler } from "../utils/response_handler";
import { NotificationHistoryService } from "../services/notification-history.service";

export const getConsumerNotifications = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.currentUser?._id?.toString();
            if (!userId) {
                throw new Error("User not authenticated");
            }

            const { page = 1, limit = 20, unread } = req.query;
            const result = await NotificationHistoryService.getNotifications(
                userId,
                "consumer",
                Number(page),
                Number(limit),
                unread === "true"
            );

            ok_handler(res, "Notifications fetched successfully", result);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
};

export const markConsumerNotificationRead = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.currentUser?._id?.toString();
            if (!userId) {
                throw new Error("User not authenticated");
            }

            const { id } = req.params;
            const notification = await NotificationHistoryService.markAsRead(id, userId);
            
            ok_handler(res, "Notification marked as read", notification);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
};

export const markAllConsumerNotificationsRead = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.currentUser?._id?.toString();
            if (!userId) {
                throw new Error("User not authenticated");
            }

            await NotificationHistoryService.markAllAsRead(userId, "consumer");
            
            ok_handler(res, "All notifications marked as read", {});
        } catch (error) {
            error_handler(error, req, res);
        }
    }
};

export const getConsumerUnreadCount = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.currentUser?._id?.toString();
            if (!userId) {
                throw new Error("User not authenticated");
            }

            const count = await NotificationHistoryService.getUnreadCount(userId, "consumer");
            
            ok_handler(res, "Unread count fetched", { unreadCount: count });
        } catch (error) {
            error_handler(error, req, res);
        }
    }
};

// Provider endpoints
export const getProviderNotifications = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.currentUser?._id?.toString();
            if (!userId) {
                throw new Error("User not authenticated");
            }

            const { page = 1, limit = 20, unread } = req.query;
            const result = await NotificationHistoryService.getNotifications(
                userId,
                "provider",
                Number(page),
                Number(limit),
                unread === "true"
            );

            ok_handler(res, "Notifications fetched successfully", result);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
};

export const markProviderNotificationRead = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.currentUser?._id?.toString();
            if (!userId) {
                throw new Error("User not authenticated");
            }

            const { id } = req.params;
            const notification = await NotificationHistoryService.markAsRead(id, userId);
            
            ok_handler(res, "Notification marked as read", notification);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
};

export const markAllProviderNotificationsRead = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.currentUser?._id?.toString();
            if (!userId) {
                throw new Error("User not authenticated");
            }

            await NotificationHistoryService.markAllAsRead(userId, "provider");
            
            ok_handler(res, "All notifications marked as read", {});
        } catch (error) {
            error_handler(error, req, res);
        }
    }
};

export const getProviderUnreadCount = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.currentUser?._id?.toString();
            if (!userId) {
                throw new Error("User not authenticated");
            }

            const count = await NotificationHistoryService.getUnreadCount(userId, "provider");
            
            ok_handler(res, "Unread count fetched", { unreadCount: count });
        } catch (error) {
            error_handler(error, req, res);
        }
    }
};