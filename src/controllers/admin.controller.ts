import { Request, RequestHandler, Response } from "express";
import UnauthorizedAccessException from "../exceptions/UnauthorizedAccessException";
import NotFoundException from "../exceptions/NotFoundException";
import BadRequestException from "../exceptions/BadRequestException";
import { error_handler, ok_handler } from "../utils/response_handler";
import { getUserTokenInfo } from "../utils/token.util";
import { AdminService } from "../services/admin.service";
import { AuditLogService } from "../services/audit-log.service";
import { getUsers, getUserById as getUserByIdModel, updateUserById } from "../models/user.model";
import { getProviders, getProviderById as getProviderByIdModel, updateProviderById } from "../models/provider.model";
import { getBookings, getBookingById as getBookingByIdModel } from "../models/booking.model";
import { getDisputes, getDisputeById as getDisputeByIdModel, updateDisputeById } from "../models/dispute.model";
import { NotificationService } from "../services/notifications.service";
import { AdminUserType } from "../types/admin.type";
import { Wallet } from "../models/wallet.model";
import { Transaction } from "../models/transaction.model";
import { Payment } from "../models/payment.model";
import { FinancialLedger } from "../models/financial-ledger.model";
import mongoose from "mongoose";

const getAdminId = (req: Request): string | undefined => {
    return (req.currentUser as AdminUserType)?._id;
};

export const getAdminDashboardStats = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const stats = await AdminService.getDashboardStats();
            ok_handler(res, "Admin dashboard stats", stats);
        } catch (error) {
            console.error('Admin dashboard error:', error);
            error_handler(error, req, res);
        }
    }
}

export const streamDashboardStats = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        const token = req.cookies?.['access-token'] || req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            res.status(401).send('Unauthorized');
            return;
        }

        const tokenInfo = await getUserTokenInfo({ token, token_type: 'access' });
        if (!tokenInfo?.is_valid_token || tokenInfo?.appType !== 'admin') {
            res.status(401).send('Unauthorized');
            return;
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const sendUpdate = async () => {
            try {
                const stats = await AdminService.getDashboardStats();
                res.write(`data: ${JSON.stringify(stats)}\n\n`);
            } catch (error) {
                console.error('SSE stream error:', error);
            }
        };

        sendUpdate();

        const unsubscribe = AdminService.subscribeToUpdates(() => {
            sendUpdate();
        });

        req.on('close', () => {
            unsubscribe();
            res.end();
        });
    }
}

export const getAuditLogs = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const logs = await AuditLogService.getLogs(req.query as any);
            ok_handler(res, "Audit logs fetched", logs);
        } catch (error) {
            console.error('Admin audit logs error:', error);
            error_handler(error, req, res);
        }
    }
}

export const exportResource = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const { resource } = req.params;
            const exportResult = await AdminService.exportData(resource, req.query as any);

            res.setHeader('Content-Type', exportResult.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
            res.send(exportResult.content);
        } catch (error) {
            console.error('Admin export error:', error);
            error_handler(error, req, res);
        }
    }
}

const sendExportResponse = async (res: Response, resource: string, query: any) => {
    const exportResult = await AdminService.exportData(resource, query);
    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    res.send(exportResult.content);
};

export const exportUsers = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            await sendExportResponse(res, 'users', req.query);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const exportConsumers = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            await sendExportResponse(res, 'consumers', req.query);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const exportProviders = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            await sendExportResponse(res, 'providers', req.query);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const exportBookings = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            await sendExportResponse(res, 'bookings', req.query);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const exportDisputes = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            await sendExportResponse(res, 'disputes', req.query);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const exportAuditLogs = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            await sendExportResponse(res, 'audit-logs', req.query);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const getAllUsers = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const users = await AdminService.getAllUsers();
            ok_handler(res, "Users fetched", users);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const getAllConsumers = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const consumers = await AdminService.getAllConsumers(req.query);
            ok_handler(res, "Consumers fetched", consumers);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const getConsumerById = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const consumer = await AdminService.getConsumerById(req.params.id);
            if (!consumer) {
                throw new NotFoundException("Consumer not found");
            }
            ok_handler(res, "Consumer fetched", consumer);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const updateConsumerByAdmin = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const consumer = await AdminService.updateConsumer(req.params.id, req.body);
            
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'UPDATE_CONSUMER',
                targetType: 'Consumer',
                targetId: req.params.id,
                outcome: 'success',
                details: { updatedFields: Object.keys(req.body), adminId: getAdminId(req) }
            });
            
            ok_handler(res, "Consumer updated", consumer);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const getUserById = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const user = await getUserByIdModel(req.params.id);
            if (!user) {
                throw new NotFoundException("User not found");
            }
            ok_handler(res, "User fetched", user);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const updateUserByAdmin = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const existingUser = await getUserByIdModel(req.params.id);
            if (!existingUser) {
                throw new NotFoundException("User not found");
            }
            const user = await updateUserById(req.params.id, req.body);
            
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'UPDATE_USER',
                targetType: 'User',
                targetId: req.params.id,
                outcome: 'success',
                details: { updatedFields: Object.keys(req.body), adminId: getAdminId(req) }
            });
            
            ok_handler(res, "User updated", user);
        } catch (error) {
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'UPDATE_USER',
                targetType: 'User',
                targetId: req.params.id,
                outcome: 'failure',
                details: { error: (error as Error).message, adminId: getAdminId(req) }
            });
            error_handler(error, req, res);
        }
    }
}

export const getAllProviders = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const providers = await getProviders().select('-__v').lean();
            
            // Populate user data
            const { User } = await import('../models/user.model');
            const providerIds = providers.map(p => p.userId);
            const users = await User.find({ _id: { $in: providerIds } }).lean();
            const userMap = new Map(users.map(u => [u._id.toString(), u]));
            
            const providersWithUser = providers.map(p => {
                const user = userMap.get(p.userId?.toString()) as any || {};
                return {
                    ...p,
                    email: user.providerEmail || user.email || '',
                    phone: user.providerPhone || user.phone || '',
                    isEmailVerified: user.isProviderEmailVerified || false,
                };
            });
            
            ok_handler(res, "Providers fetched", providersWithUser);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const getProviderById = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const provider = await getProviderByIdModel(req.params.id).populate('userId');
            if (!provider) {
                throw new NotFoundException("Provider not found");
            }
            
            const userData = (provider as any).userId || {};
            
            // Extract user fields directly at top level
            const { userId, ...providerWithoutUserId } = provider.toObject() as any;
            
            const combinedData = {
                ...providerWithoutUserId,
                email: userData.providerEmail || userData.email || '',
                phone: userData.providerPhone || userData.phone || '',
                isEmailVerified: userData.isProviderEmailVerified || false,
                createdAt: userData.createdAt,
            };
            
            ok_handler(res, "Provider fetched", combinedData);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const updateProviderByAdmin = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const existingProvider = await getProviderByIdModel(req.params.id);
            if (!existingProvider) {
                throw new NotFoundException("Provider not found");
            }
            const provider = await updateProviderById(req.params.id, req.body);
            
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'UPDATE_PROVIDER',
                targetType: 'Provider',
                targetId: req.params.id,
                outcome: 'success',
                details: { updatedFields: Object.keys(req.body), adminId: getAdminId(req) }
            });
            
            ok_handler(res, "Provider updated", provider);
        } catch (error) {
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'UPDATE_PROVIDER',
                targetType: 'Provider',
                targetId: req.params.id,
                outcome: 'failure',
                details: { error: (error as Error).message, adminId: getAdminId(req) }
            });
            error_handler(error, req, res);
        }
    }
}

export const approveProvider = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const existingProvider = await getProviderByIdModel(req.params.id);
            if (!existingProvider) {
                throw new NotFoundException("Provider not found");
            }
            const provider = await updateProviderById(req.params.id, { status: 'approved' });
            
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'APPROVE_PROVIDER',
                targetType: 'Provider',
                targetId: req.params.id,
                outcome: 'success',
                details: { adminId: getAdminId(req), providerEmail: existingProvider.email }
            });

            // Send notification to provider
            try {
                await NotificationService.sendByProfile(
                    'provider',
                    req.params.id,
                    "Congratulations! Your Account is Active 🎉",
                    "Your provider account has been approved. You can now start accepting jobs and earning.",
                    { type: 'approval', screen: 'Home' }
                );
            } catch (notifyErr) {
                console.error("Provider approval notification error (non-blocking):", notifyErr);
            }
            
            ok_handler(res, "Provider approved", provider);
        } catch (error) {
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'APPROVE_PROVIDER',
                targetType: 'Provider',
                targetId: req.params.id,
                outcome: 'failure',
                details: { error: (error as Error).message, adminId: getAdminId(req) }
            });
            error_handler(error, req, res);
        }
    }
}

export const rejectProvider = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const existingProvider = await getProviderByIdModel(req.params.id);
            if (!existingProvider) {
                throw new NotFoundException("Provider not found");
            }
            const { reason } = req.body;
            const provider = await updateProviderById(req.params.id, { status: 'rejected' });
            
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'REJECT_PROVIDER',
                targetType: 'Provider',
                targetId: req.params.id,
                outcome: 'success',
                details: { adminId: getAdminId(req), providerEmail: existingProvider.email, reason }
            });

            // Send notification to provider
            try {
                const reasonText = reason || "Your application did not meet our requirements.";
                await NotificationService.sendByProfile(
                    'provider',
                    req.params.id,
                    "Application Update ℹ️",
                    `Your provider application was not approved. ${reasonText}`,
                    { type: 'rejection', screen: 'Profile' }
                );
            } catch (notifyErr) {
                console.error("Provider rejection notification error (non-blocking):", notifyErr);
            }
            
            ok_handler(res, "Provider rejected", provider);
        } catch (error) {
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'REJECT_PROVIDER',
                targetType: 'Provider',
                targetId: req.params.id,
                outcome: 'failure',
                details: { error: (error as Error).message, adminId: getAdminId(req) }
            });
            error_handler(error, req, res);
        }
    }
}

export const getAllBookings = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const bookings = await getBookings(req.query as any).select('-__v').lean();
            ok_handler(res, "Bookings fetched", bookings);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const getBookingById = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const booking = await AdminService.getBookingById(req.params.id);
            if (!booking) {
                throw new NotFoundException("Booking not found");
            }
            ok_handler(res, "Booking fetched", booking);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const adminCancelBooking = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const { reason } = req.body;
            if (!reason) {
                throw new BadRequestException("Reason is required");
            }
            const booking = await AdminService.adminCancelBooking(
                req.params.id, 
                req.currentUser._id.toString(), 
                reason
            );
            ok_handler(res, "Booking cancelled", booking);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const adminRefundBooking = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const { reason } = req.body;
            if (!reason) {
                throw new BadRequestException("Reason is required");
            }
            const booking = await AdminService.adminRefundBooking(
                req.params.id, 
                req.currentUser._id.toString(), 
                reason
            );
            ok_handler(res, "Booking refunded", booking);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const adminCompleteBooking = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const { reason } = req.body;
            if (!reason) {
                throw new BadRequestException("Reason is required");
            }
            const booking = await AdminService.adminCompleteBooking(
                req.params.id, 
                req.currentUser._id.toString(), 
                reason
            );
            ok_handler(res, "Booking marked as completed", booking);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const adminResolveDispute = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const { resolution, adminNotes } = req.body;
            if (!resolution || !adminNotes) {
                throw new BadRequestException("Resolution and notes are required");
            }
            const booking = await AdminService.adminResolveDispute(
                req.params.id, 
                req.currentUser._id.toString(), 
                resolution, 
                adminNotes
            );
            ok_handler(res, "Dispute resolved", booking);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const getAllDisputes = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const disputes = await getDisputes(req.query as any).select('-__v').lean();
            ok_handler(res, "Disputes fetched", disputes);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const getDisputeById = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const dispute = await AdminService.getDisputeById(req.params.id);
            if (!dispute) {
                throw new NotFoundException("Dispute not found");
            }
            ok_handler(res, "Dispute fetched", dispute);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const resolveDispute = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const existingDispute = await getDisputeByIdModel(req.params.id);
            if (!existingDispute) {
                throw new NotFoundException("Dispute not found");
            }
            const dispute = await updateDisputeById(req.params.id, {
                ...req.body,
                resolvedAt: new Date(),
                resolvedBy: req.currentUser._id
            });
            
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'RESOLVE_DISPUTE',
                targetType: 'Dispute',
                targetId: req.params.id,
                outcome: 'success',
                details: { resolution: req.body.resolution, adminNotes: req.body.adminNotes, adminId: getAdminId(req) }
            });
            
            ok_handler(res, "Dispute resolved", dispute);
        } catch (error) {
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'RESOLVE_DISPUTE',
                targetType: 'Dispute',
                targetId: req.params.id,
                outcome: 'failure',
                details: { error: (error as Error).message, adminId: getAdminId(req) }
            });
            error_handler(error, req, res);
        }
    }
}

export const broadcastNotification = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }
            const { title, message, targetRole } = req.body;
            
            if (!title || !message) {
                throw new Error("Title and message are required");
            }

            await NotificationService.broadcastPushNotification(title, message, targetRole);
            
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'BROADCAST_NOTIFICATION',
                targetType: 'Notification',
                targetId: `broadcast-${Date.now()}`,
                outcome: 'success',
                details: { title, targetRole, adminId: getAdminId(req) }
            });
            
            ok_handler(res, "Notification broadcast sent", null);
        } catch (error) {
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'BROADCAST_NOTIFICATION',
                targetType: 'Notification',
                targetId: `broadcast-${Date.now()}`,
                outcome: 'failure',
                details: { error: (error as Error).message, adminId: getAdminId(req) }
            });
            error_handler(error, req, res);
        }
    }
}

export const getAllAdmins = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const admins = await AdminService.getAllAdmins();
            ok_handler(res, "Admins retrieved successfully", admins);
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const createAdmin = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const { email, password, firstName, lastName, role } = req.body;

            if (!email || !password || !role) {
                throw new BadRequestException("Email, password, and role are required");
            }

            const admin = await AdminService.createAdmin({
                email,
                password,
                firstName,
                lastName,
                role
            });

            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'CREATE_ADMIN',
                targetType: 'Admin',
                targetId: admin._id,
                outcome: 'success',
                details: { createdAdminEmail: email, role, adminId: getAdminId(req) }
            });

            ok_handler(res, "Admin created successfully", admin);
        } catch (error) {
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'CREATE_ADMIN',
                targetType: 'Admin',
                targetId: 'unknown',
                outcome: 'failure',
                details: { error: (error as Error).message, adminId: getAdminId(req) }
            });
            error_handler(error, req, res);
        }
    }
}

export const updateAdmin = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const { id } = req.params;
            const { role, firstName, lastName, isActive } = req.body;
            const currentAdminId = getAdminId(req);

            if (!id) {
                throw new BadRequestException("Admin ID is required");
            }

            if (id === currentAdminId) {
                throw new BadRequestException("You cannot edit your own account");
            }

            const admin = await AdminService.updateAdmin(id, { role, firstName, lastName, isActive });

            await AuditLogService.record({
                actorId: currentAdminId as any,
                actorType: 'admin',
                action: 'UPDATE_ADMIN',
                targetType: 'Admin',
                targetId: id,
                outcome: 'success',
                details: { updatedFields: { role, firstName, lastName, isActive }, adminId: currentAdminId }
            });

            ok_handler(res, "Admin updated successfully", admin);
        } catch (error) {
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'UPDATE_ADMIN',
                targetType: 'Admin',
                targetId: req.params.id,
                outcome: 'failure',
                details: { error: (error as Error).message, adminId: getAdminId(req) }
            });
            error_handler(error, req, res);
        }
    }
}

export const toggleAdminStatus = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const { id } = req.params;
            const currentAdminId = getAdminId(req);

            if (!id) {
                throw new BadRequestException("Admin ID is required");
            }

            if (id === currentAdminId) {
                throw new BadRequestException("You cannot deactivate your own account");
            }

            const admin = await AdminService.toggleAdminStatus(id);

            await AuditLogService.record({
                actorId: currentAdminId as any,
                actorType: 'admin',
                action: 'TOGGLE_ADMIN_STATUS',
                targetType: 'Admin',
                targetId: id,
                outcome: 'success',
                details: { newStatus: admin.isActive, adminId: currentAdminId }
            });

            ok_handler(res, "Admin status updated successfully", admin);
        } catch (error) {
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'TOGGLE_ADMIN_STATUS',
                targetType: 'Admin',
                targetId: req.params.id,
                outcome: 'failure',
                details: { error: (error as Error).message, adminId: getAdminId(req) }
            });
            error_handler(error, req, res);
        }
    }
}

export const getAllWallets = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const { search, page = 1, limit = 20 } = req.query;

            const query: any = {};

            if (search) {
                const searchStr = search as string;
                const providers = await getProviders()
                    .or([
                        { providerEmail: { $regex: searchStr, $options: 'i' } },
                        { firstName: { $regex: searchStr, $options: 'i' } },
                        { lastName: { $regex: searchStr, $options: 'i' } }
                    ])
                    .lean();

                const providerIds = providers.map((p: any) => p._id);
                if (providerIds.length > 0) {
                    query.providerId = { $in: providerIds };
                } else {
                    ok_handler(res, "Wallets fetched successfully", {
                        wallets: [],
                        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
                    });
                    return;
                }
            }

            const skip = (Number(page) - 1) * Number(limit);
            const wallets = await Wallet.find(query)
                .populate('providerId', 'firstName lastName providerEmail')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean();

            const total = await Wallet.countDocuments(query);

            ok_handler(res, "Wallets fetched successfully", {
                wallets,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const getWalletById = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const wallet = await Wallet.findById(req.params.id).populate('providerId', 'firstName lastName providerEmail phone');

            if (!wallet) {
                throw new NotFoundException("Wallet not found");
            }

            const recentTransactions = await Transaction.find({ walletId: wallet._id })
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();

            ok_handler(res, "Wallet fetched successfully", { wallet, recentTransactions });
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const getAllWalletTransactions = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const { type, status, purpose, providerId, startDate, endDate, page = 1, limit = 50 } = req.query;

            const query: any = {};

            if (type) query.type = type;
            if (status) query.status = status;
            if (purpose) query.purpose = purpose;
            if (providerId) query.providerId = providerId;

            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate as string);
                if (endDate) query.createdAt.$lte = new Date(endDate as string);
            }

            const skip = (Number(page) - 1) * Number(limit);
            const transactions = await Transaction.find(query)
                .populate('providerId', 'firstName lastName providerEmail')
                .populate('bookingId', 'serviceName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean();

            const total = await Transaction.countDocuments(query);

            ok_handler(res, "Transactions fetched successfully", {
                transactions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const getAllPayments = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const { status, financialStatus, startDate, endDate, page = 1, limit = 50 } = req.query;

            const query: any = {};

            if (status) query.status = status;
            if (financialStatus) query.financialStatus = financialStatus;

            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate as string);
                if (endDate) query.createdAt.$lte = new Date(endDate as string);
            }

            const skip = (Number(page) - 1) * Number(limit);
            const payments = await Payment.find(query)
                .populate('bookingId', 'serviceName consumerId providerId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean();

            const total = await Payment.countDocuments(query);

            ok_handler(res, "Payments fetched successfully", {
                payments,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const getPaymentById = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const payment = await Payment.findById(req.params.id)
                .populate('bookingId')
                .lean();

            if (!payment) {
                throw new NotFoundException("Payment not found");
            }

            const ledgerEntries = await FinancialLedger.find({ paymentId: payment._id })
                .sort({ createdAt: -1 })
                .lean();

            ok_handler(res, "Payment fetched successfully", { payment, ledgerEntries });
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const getFinancialLedger = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const { entryType, providerId, bookingId, startDate, endDate, page = 1, limit = 50 } = req.query;

            const query: any = {};

            if (entryType) query.entryType = entryType;
            if (providerId) query.providerId = providerId;
            if (bookingId) query.bookingId = bookingId;

            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate as string);
                if (endDate) query.createdAt.$lte = new Date(endDate as string);
            }

            const skip = (Number(page) - 1) * Number(limit);
            const entries = await FinancialLedger.find(query)
                .populate('providerId', 'firstName lastName providerEmail')
                .populate('bookingId', 'serviceName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean();

            const total = await FinancialLedger.countDocuments(query);

            ok_handler(res, "Financial ledger fetched successfully", {
                entries,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const getFinancialSummary = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const walletStats = await Wallet.aggregate([
                {
                    $group: {
                        _id: null,
                        totalAvailable: { $sum: "$availableBalance" },
                        totalPending: { $sum: "$pendingBalance" },
                        totalEarned: { $sum: "$totalEarned" },
                        walletCount: { $sum: 1 }
                    }
                }
            ]);

            const platformFeeStats = await Transaction.aggregate([
                { $match: { purpose: "platform_fee", status: "completed" } },
                {
                    $group: {
                        _id: null,
                        totalPlatformFees: { $sum: "$amount" }
                    }
                }
            ]);

            const paymentStats = await Payment.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                        totalAmount: { $sum: "$amount" }
                    }
                }
            ]);

            const withdrawalStats = await Transaction.aggregate([
                { $match: { purpose: "withdrawal" } },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                        totalAmount: { $sum: "$amount" }
                    }
                }
            ]);

            ok_handler(res, "Financial summary fetched successfully", {
                wallets: walletStats[0] || { totalAvailable: 0, totalPending: 0, totalEarned: 0, walletCount: 0 },
                platformFees: platformFeeStats[0]?.totalPlatformFees || 0,
                payments: paymentStats.reduce((acc: any, stat: any) => {
                    acc[stat._id] = { count: stat.count, amount: stat.totalAmount };
                    return acc;
                }, {}),
                withdrawals: withdrawalStats.reduce((acc: any, stat: any) => {
                    acc[stat._id] = { count: stat.count, amount: stat.totalAmount };
                    return acc;
                }, {})
            });
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const getAllWithdrawals = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const { status, page = 1, limit = 50 } = req.query;

            const query: any = { purpose: "withdrawal" };
            if (status) query.status = status;

            const skip = (Number(page) - 1) * Number(limit);
            const withdrawals = await Transaction.find(query)
                .populate('providerId', 'firstName lastName providerEmail')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean();

            const total = await Transaction.countDocuments(query);

            ok_handler(res, "Withdrawals fetched successfully", {
                withdrawals,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const approveWithdrawal = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const transaction = await Transaction.findOne({
                _id: req.params.id,
                purpose: "withdrawal",
                status: "pending"
            });

            if (!transaction) {
                throw new NotFoundException("Pending withdrawal not found");
            }

            const wallet = await Wallet.findById(transaction.walletId);
            if (!wallet || wallet.availableBalance < transaction.amount) {
                throw new BadRequestException("Insufficient wallet balance");
            }

            wallet.availableBalance -= transaction.amount;
            await wallet.save();

            transaction.status = "completed";
            await transaction.save();

            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'APPROVE_WITHDRAWAL',
                targetType: 'Transaction',
                targetId: transaction._id,
                outcome: 'success',
                details: { amount: transaction.amount, providerId: transaction.providerId }
            });

            // Send notification to provider
            try {
                await NotificationService.sendByProfile(
                    'provider',
                    transaction.providerId.toString(),
                    "Withdrawal Approved! ✅",
                    `Your withdrawal of ₦${Number(transaction.amount).toLocaleString()} has been approved and is being processed to your bank.`,
                    { type: 'withdrawal', screen: 'Withdraw', status: 'completed' }
                );
            } catch (notifyErr) {
                console.error("Withdrawal approval notification error (non-blocking):", notifyErr);
            }

            ok_handler(res, "Withdrawal approved successfully", transaction);
        } catch (error) {
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'APPROVE_WITHDRAWAL',
                targetType: 'Transaction',
                targetId: req.params.id,
                outcome: 'failure',
                details: { error: (error as Error).message }
            });
            error_handler(error, req, res);
        }
    }
}

export const rejectWithdrawal = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.currentUser) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const { reason } = req.body;

            const transaction = await Transaction.findOne({
                _id: req.params.id,
                purpose: "withdrawal",
                status: "pending"
            });

            if (!transaction) {
                throw new NotFoundException("Pending withdrawal not found");
            }

            transaction.status = "failed";
            if (reason) {
                transaction.description = `Rejected: ${reason}`;
            }
            await transaction.save();

            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'REJECT_WITHDRAWAL',
                targetType: 'Transaction',
                targetId: transaction._id,
                outcome: 'success',
                details: { amount: transaction.amount, reason, providerId: transaction.providerId }
            });

            // Send notification to provider
            try {
                const reasonText = reason || "Your withdrawal request could not be processed.";
                await NotificationService.sendByProfile(
                    'provider',
                    transaction.providerId.toString(),
                    "Withdrawal Rejected ❌",
                    `Your withdrawal of ₦${Number(transaction.amount).toLocaleString()} was rejected. ${reasonText}`,
                    { type: 'withdrawal', screen: 'Withdraw', status: 'failed' }
                );
            } catch (notifyErr) {
                console.error("Withdrawal rejection notification error (non-blocking):", notifyErr);
            }

            ok_handler(res, "Withdrawal rejected successfully", transaction);
        } catch (error) {
            await AuditLogService.record({
                actorId: getAdminId(req) as any,
                actorType: 'admin',
                action: 'REJECT_WITHDRAWAL',
                targetType: 'Transaction',
                targetId: req.params.id,
                outcome: 'failure',
                details: { error: (error as Error).message }
            });
            error_handler(error, req, res);
        }
    }
}