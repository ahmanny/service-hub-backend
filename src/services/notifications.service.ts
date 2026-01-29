import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { Consumer } from '../models/consumer.model';
import { Provider } from '../models/provider.model';
import { User } from '../models/user.model';
import { Model } from 'mongoose';
import { AppRole } from '../utils';

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
        const user = await User.findById(userId).select('consumerPushTokens providerPushTokens').lean();
        if (!user) return;

        // Pick tokens based on the role the notification is intended for
        const tokens = role === 'consumer' ? user.consumerPushTokens : user.providerPushTokens;

        if (!tokens || tokens.length === 0) {
            console.log(`[Notification] No tokens found for user ${userId} as ${role}`);
            return;
        }

        await this.dispatchPush(tokens, title, body, role, data);
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
                sound: 'default',
                title,
                body,
                data: data || {},
                priority: 'high',
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