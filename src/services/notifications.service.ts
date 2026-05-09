import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { Consumer } from '../models/consumer.model';
import { Provider } from '../models/provider.model';
import { User } from '../models/user.model';
import { Model } from 'mongoose';
import { AppRole } from '../utils';
import { NotificationHistoryService } from './notification-history.service';

const expo = new Expo();

class NotificationServiceClass {
    /**
     * Helper to send to a specific Profile (Consumer or Provider)
     */
    public async sendByProfile(
        profileType: AppRole,
        profileId: string,
        title: string,
        body: string,
        data?: Record<string, unknown>
    ) {
        const ProfileModel = (profileType === 'consumer' ? Consumer : Provider) as Model<any>;
        const profile = await ProfileModel.findById(profileId).select('userId').lean();

        if (!profile?.userId) {
            console.warn(`[NotificationService] No userId found for ${profileType}: ${profileId}`);
            return;
        }

        return this.sendToUser(profile.userId.toString(), title, profileType, body, data);
    }

    /**
     * Core logic to send to the correct role-based tokens owned by a User
     */
    public async sendToUser(
        userId: string,
        title: string,
        role: AppRole,
        body: string,
        data?: Record<string, unknown>
    ) {
        if (role === 'admin') {
            console.log(`[Notification] Admin notifications not supported`);
            return;
        }

        // Save notification to database for history
        const notificationType = this.getNotificationType(data);
        try {
            await NotificationHistoryService.createNotification(
                userId,
                role,
                title,
                body,
                notificationType,
                data as Record<string, any>
            );
        } catch (saveErr) {
            console.error("[NotificationService] Failed to save notification:", saveErr);
        }

        const user = await User.findById(userId).select('consumerPushTokens providerPushTokens').lean();
        if (!user) return;

        let tokens: string[] = [];
        if (role === 'consumer') tokens = user.consumerPushTokens || [];
        else if (role === 'provider') tokens = user.providerPushTokens || [];

        if (!tokens || tokens.length === 0) {
            console.log(`[Notification] No tokens found for user ${userId} as ${role}`);
            return;
        }

        await this.dispatchPush(tokens, title, body, role, data);
    }

    /**
     * Determine notification type from data
     */
    private getNotificationType(data?: Record<string, unknown>): "welcome" | "booking" | "payment" | "withdrawal" | "approval" | "system" {
        if (!data) return "system";
        const type = data.type as string;
        if (type === "welcome") return "welcome";
        if (type === "booking" || type === "PAYMENT_REQUIRED" || type === "BOOKING_CONFIRMED") return "booking";
        if (type === "payment" || type === "PAYMENT_COMPLETED") return "payment";
        if (type === "withdrawal" || type === "withdrawal_pending") return "withdrawal";
        if (type === "approval" || type === "rejection") return "approval";
        return "system";
    }

    public async broadcastPushNotification(title: string, message: string, targetRole?: AppRole) {
        if (targetRole === 'admin') {
            console.log(`[Notification] Admin broadcast not supported`);
            return;
        }

        const query: any = {};
        
        if (targetRole === 'consumer') {
            query.consumerPushTokens = { $exists: true, $ne: [] };
        } else if (targetRole === 'provider') {
            query.providerPushTokens = { $exists: true, $ne: [] };
        }

        const users = await User.find(query).select('consumerPushTokens providerPushTokens').lean();
        
        const allTokens: string[] = [];
        for (const user of users) {
            if (targetRole === 'consumer') {
                allTokens.push(...(user.consumerPushTokens || []));
            } else if (targetRole === 'provider') {
                allTokens.push(...(user.providerPushTokens || []));
            } else {
                allTokens.push(
                    ...(user.consumerPushTokens || []),
                    ...(user.providerPushTokens || [])
                );
            }
        }

        if (allTokens.length > 0) {
            await this.dispatchPush(allTokens, title, message, targetRole || 'consumer', {});
        }
    }

    /**
     * Handles the heavy lifting of chunking and sending to Expo
     */
    private async dispatchPush(
        tokens: string[],
        title: string,
        body: string,
        role: AppRole,
        data?: Record<string, unknown>
    ) {
        const messages: ExpoPushMessage[] = [];

        for (const token of tokens) {
            if (!Expo.isExpoPushToken(token)) {
                console.error(`Push token ${token} is not a valid Expo push token`);
                continue;
            }

            messages.push({
                to: token,
                title,
                body,
                data: data || {},
                sound: 'default', // REQUIRED for vibration on iOS
                priority: 'high',  // REQUIRED for vibration/heads-up on Android
                interruptionLevel: 'time-sensitive',
                channelId: 'default',
            });
        }

        const chunks = expo.chunkPushNotifications(messages);

        for (const chunk of chunks) {
            try {
                const tickets = await expo.sendPushNotificationsAsync(chunk);
                // Handle tickets to clean up dead tokens from the correct array
                this.handleTickets(tickets, chunk, role);
            } catch (error) {
                console.error("[NotificationService] Fatal chunk error:", error);
            }
        }
    }

    /**
     * Handle receipt tickets to clean up dead tokens from specific role arrays
     */
    private async handleTickets(tickets: ExpoPushTicket[], chunk: ExpoPushMessage[], role: AppRole) {
        if (role === 'admin') return;

        const tokenField = role === 'consumer' ? 'consumerPushTokens' : 'providerPushTokens';

        tickets.forEach(async (ticket, index) => {
            if (ticket.status === 'error') {
                const deadToken = (chunk[index].to as string);

                // DeviceNotRegistered means the user uninstalled the app or cleared data
                if (ticket.details?.error === 'DeviceNotRegistered') {
                    console.log(`[NotificationService] Removing dead ${role} token: ${deadToken}`);

                    await User.updateMany(
                        { [tokenField]: deadToken },
                        { $pull: { [tokenField]: deadToken } }
                    );
                }
            }
        });
    }
}

export const NotificationService = new NotificationServiceClass();