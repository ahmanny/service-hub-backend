import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { Consumer } from '../models/consumer.model';
import { Provider } from '../models/provider.model';
import { User } from '../models/user.model';
import { Model } from 'mongoose';

const expo = new Expo();

class NotificationServiceClass {
    /**
     * Helper to send to a specific Profile
     */
    public async sendByProfile(
        profileType: 'consumer' | 'provider',
        profileId: string,
        title: string,
        body: string,
        data?: Record<string, unknown> // Fixed type here
    ) {
        const ProfileModel = (profileType === 'consumer' ? Consumer : Provider) as Model<any>;
        const profile = await ProfileModel.findById(profileId).select('userId').lean();

        if (!profile?.userId) {
            console.warn(`[NotificationService] No userId found for ${profileType}: ${profileId}`);
            return;
        }

        return this.sendToUser(profile.userId.toString(), title, body, data);
    }

    /**
     * Core logic to send to all tokens owned by a User
     */
    public async sendToUser(
        userId: string,
        title: string,
        body: string,
        data?: Record<string, unknown> // Fixed type here
    ) {
        const user = await User.findById(userId).select('pushTokens');

        if (!user || !user.pushTokens || user.pushTokens.length === 0) return;

        // 1. Filter out invalid tokens immediately
        const messages: ExpoPushMessage[] = [];
        for (const token of user.pushTokens) {
            if (!Expo.isExpoPushToken(token)) {
                console.error(`Push token ${token} is not a valid Expo push token`);
                // Optional: Remove invalid token from DB here
                continue;
            }

            messages.push({
                to: token,
                sound: 'default',
                title,
                body,
                data: data || {},
                priority: 'high',
            });
        }

        // 2. Send in chunks
        const chunks = expo.chunkPushNotifications(messages);

        for (const chunk of chunks) {
            try {
                const tickets = await expo.sendPushNotificationsAsync(chunk);
                this.handleTickets(tickets, chunk);
            } catch (error) {
                console.error("[NotificationService] Fatal chunk error:", error);
            }
        }
    }

    /**
     *  Handle receipt tickets to clean up dead tokens
     */
    private async handleTickets(tickets: ExpoPushTicket[], chunk: ExpoPushMessage[]) {
        tickets.forEach(async (ticket, index) => {
            if (ticket.status === 'error') {
                if (ticket.details?.error === 'DeviceNotRegistered') {
                    const deadToken = chunk[index].to;
                    console.log(`[NotificationService] Removing dead token: ${deadToken}`);

                    // Cleanup: Remove the token from any user that has it
                    await User.updateMany(
                        { pushTokens: deadToken },
                        { $pull: { pushTokens: deadToken } }
                    );
                }
            }
        });
    }
}

export const NotificationService = new NotificationServiceClass();