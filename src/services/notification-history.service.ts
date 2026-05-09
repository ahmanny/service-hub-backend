import { Notification } from "../models/notification.model";
import { User } from "../models/user.model";
import { AppRole } from "../utils";

class NotificationHistoryServiceClass {
    /**
     * Save a notification to the database for history
     */
    public async createNotification(
        userId: string,
        role: AppRole,
        title: string,
        body: string,
        type: "welcome" | "booking" | "payment" | "withdrawal" | "approval" | "system",
        data?: Record<string, any>
    ) {
        const notification = new Notification({
            userId: new (await import("mongoose")).Types.ObjectId(userId),
            role,
            title,
            body,
            type,
            data: data || {},
            isRead: false,
        });

        return await notification.save();
    }

    /**
     * Get notifications for a user with pagination
     */
    public async getNotifications(
        userId: string,
        role: "consumer" | "provider",
        page: number = 1,
        limit: number = 20,
        unreadOnly: boolean = false
    ) {
        const query: any = {
            userId: new (await import("mongoose")).Types.ObjectId(userId),
            role,
        };

        if (unreadOnly) {
            query.isRead = false;
        }

        const skip = (page - 1) * limit;

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Notification.countDocuments(query),
            Notification.countDocuments({ ...query, isRead: false }),
        ]);

        return {
            notifications,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            unreadCount,
        };
    }

    /**
     * Mark a notification as read
     */
    public async markAsRead(notificationId: string, userId: string) {
        return await Notification.findOneAndUpdate(
            { _id: notificationId, userId: new (await import("mongoose")).Types.ObjectId(userId) },
            { isRead: true, readAt: new Date() },
            { new: true }
        );
    }

    /**
     * Mark all notifications as read for a user
     */
    public async markAllAsRead(userId: string, role: "consumer" | "provider") {
        return await Notification.updateMany(
            { userId: new (await import("mongoose")).Types.ObjectId(userId), role, isRead: false },
            { isRead: true, readAt: new Date() }
        );
    }

    /**
     * Get unread count for a user
     */
    public async getUnreadCount(userId: string, role: "consumer" | "provider") {
        return await Notification.countDocuments({
            userId: new (await import("mongoose")).Types.ObjectId(userId),
            role,
            isRead: false,
        });
    }
}

export const NotificationHistoryService = new NotificationHistoryServiceClass();