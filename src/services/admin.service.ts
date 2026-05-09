import { startOfMonth } from 'date-fns';
import { Booking } from '../models/booking.model';
import { Provider } from '../models/provider.model';
import { Consumer } from '../models/consumer.model';
import { Dispute } from '../models/dispute.model';
import { User } from '../models/user.model';
import { AuditLog } from '../models/audit-log.model';
import { BookingStatus, DisputeResolution, PaymentStatus } from '../types/booking.types';
import BadRequestException from '../exceptions/BadRequestException';
import { getAllAdmins, updateAdminById, checkEmailExists, countSuperAdmins, createAdmin as createAdminModel } from '../models/admin.model';
import bcrypt from 'bcryptjs';
import { AdminRole } from '../types/admin.type';
import NotFoundException from '../exceptions/NotFoundException';

import { EventEmitter } from 'events';

class AdminServiceClass extends EventEmitter {
    constructor() {
        super();
        this.setupChangeListeners();
    }

    private setupChangeListeners() {
        Booking.watch().on('change', () => {
            this.emit('update');
        });
        Provider.watch().on('change', () => {
            this.emit('update');
        });
        Consumer.watch().on('change', () => {
            this.emit('update');
        });
        Dispute.watch().on('change', () => {
            this.emit('update');
        });
    }

    public async getDashboardStats() {
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const totalBookingsPromise = Booking.countDocuments();
        const completedBookingsPromise = Booking.countDocuments({ status: BookingStatus.COMPLETED });
        const cancelledBookingsPromise = Booking.countDocuments({ status: BookingStatus.CANCELLED });
        const totalConsumersPromise = Consumer.countDocuments();
        const totalProvidersPromise = Provider.countDocuments();
        const activeProvidersPromise = Provider.countDocuments({ status: 'approved', isAvailable: true });
        const pendingProvidersPromise = Provider.countDocuments({ status: 'pending' });
        const totalDisputesPromise = Dispute.countDocuments();
        const pendingDisputesPromise = Dispute.countDocuments({ resolution: DisputeResolution.PENDING });
        const resolvedDisputesPromise = Dispute.countDocuments({ resolution: { $in: ['resolved', 'RESOLVED'] } });
        const monthlyBookingsPromise = Booking.countDocuments({ createdAt: { $gte: startOfCurrentMonth } });
        const lastMonthBookingsPromise = Booking.countDocuments({ 
            createdAt: { $gte: lastMonthStart, $lt: startOfCurrentMonth } 
        });

        const [
            totalBookings,
            completedBookings,
            cancelledBookings,
            totalConsumers,
            totalProviders,
            activeProviders,
            pendingProviders,
            totalDisputes,
            pendingDisputes,
            resolvedDisputes,
            monthlyBookings,
            lastMonthBookings,
        ] = await Promise.all([
            totalBookingsPromise,
            completedBookingsPromise,
            cancelledBookingsPromise,
            totalConsumersPromise,
            totalProvidersPromise,
            activeProvidersPromise,
            pendingProvidersPromise,
            totalDisputesPromise,
            pendingDisputesPromise,
            resolvedDisputesPromise,
            monthlyBookingsPromise,
            lastMonthBookingsPromise,
        ]);

        const revenueAggregation = await Booking.aggregate([
            {
                $match: {
                    paymentStatus: { $in: [PaymentStatus.AUTHORIZED, PaymentStatus.HELD, PaymentStatus.RELEASED] },
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$price.total' },
                    platformRevenue: { $sum: '$price.platformFee' },
                },
            },
        ]);

        const { totalRevenue = 0, platformRevenue = 0 } = revenueAggregation[0] || {};

        // Calculate growth
        const bookingsGrowth = lastMonthBookings > 0 
            ? ((monthlyBookings - lastMonthBookings) / lastMonthBookings) * 100 
            : 0;

        return {
            totalBookings,
            completedBookings,
            cancelledBookings,
            inProgressBookings: totalBookings - completedBookings - cancelledBookings,
            totalConsumers,
            totalProviders,
            activeProviders,
            pendingProviders,
            totalDisputes,
            pendingDisputes,
            resolvedDisputes,
            monthlyBookings,
            lastMonthBookings,
            bookingsGrowth: Math.round(bookingsGrowth * 10) / 10,
            totalRevenue,
            platformRevenue,
            completionRate: totalBookings > 0 ? completedBookings / totalBookings : 0,
            disputeRate: totalBookings > 0 ? totalDisputes / totalBookings : 0,
        };
    }

    private formatCsvValue(value: any) {
        if (value === null || value === undefined) return '';
        let formatted = typeof value === 'object' ? JSON.stringify(value) : String(value);
        formatted = formatted.replace(/"/g, '""');
        if (formatted.includes(',') || formatted.includes('\n') || formatted.includes('"')) {
            formatted = `"${formatted}"`;
        }
        return formatted;
    }

    private buildCsv(rows: any[], headers: string[], keys: string[]) {
        const lines = [headers.join(',')];
        for (const row of rows) {
            const cells = keys.map((key) => this.formatCsvValue(row[key]));
            lines.push(cells.join(','));
        }
        return lines.join('\r\n');
    }

    public async getAllUsers() {
        const users = await User.find().select('-__v').lean();
        
        const userIds = users.map(u => u._id);
        
        const consumers = await Consumer.find({ userId: { $in: userIds } }).select('_id userId').lean();
        const providers = await Provider.find({ userId: { $in: userIds } }).select('_id userId').lean();
        
        const consumerMap = new Map(consumers.map(c => [c.userId?.toString(), c._id?.toString()]));
        const providerMap = new Map(providers.map(p => [p.userId?.toString(), p._id?.toString()]));
        
        return users.map(user => ({
            ...user,
            consumerId: consumerMap.get(user._id?.toString()) || null,
            providerId: providerMap.get(user._id?.toString()) || null,
        }));
    }

    public async getAllConsumers(query: any) {
        const page = parseInt(query.page as string) || 1;
        const limit = parseInt(query.limit as string) || 20;
        const skip = (page - 1) * limit;
        const filter = this.buildQuery(query);

        const consumers = await Consumer.find(filter).skip(skip).limit(limit).lean();
        const total = await Consumer.countDocuments(filter);

        // Populate user data for each consumer
        const { User } = await import('../models/user.model');
        const consumerIds = consumers.map(c => c.userId);
        const users = await User.find({ _id: { $in: consumerIds } }).lean();
        const userMap = new Map(users.map(u => [u._id.toString(), u]));

        const consumersWithUser = consumers.map(c => {
            const user = userMap.get(c.userId?.toString()) as any || {};
            return {
                ...c,
                profilePicture: c.avatarUrl || '',
                email: user.consumerEmail || user.email || '',
                phone: user.consumerPhone || user.phone || '',
                isConsumerEmailVerified: user.isConsumerEmailVerified || false,
                isVerified: c.verificationStatus === 'verified',
            };
        });

        return {
            data: consumersWithUser,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    public async getConsumerById(id: string) {
        const consumer = await Consumer.findById(id).lean();
        if (!consumer) return null;
        
        const { User } = await import('../models/user.model');
        const user = await User.findById(consumer.userId).lean() as any;
        
        return {
            ...consumer,
            profilePicture: consumer.avatarUrl || '',
            email: user?.consumerEmail || user?.email || '',
            phone: user?.consumerPhone || user?.phone || '',
            isConsumerEmailVerified: user?.isConsumerEmailVerified || false,
            isVerified: consumer.verificationStatus === 'verified',
        };
    }

    public async updateConsumer(id: string, updates: any) {
        const consumer = await Consumer.findByIdAndUpdate(id, updates, { new: true });
        return consumer;
    }

    public async getBookingById(id: string) {
        const booking = await Booking.findById(id).lean();
        if (!booking) return null;

        const consumer = await Consumer.findById(booking.consumerId).lean();
        const provider = await Provider.findById(booking.providerId).lean();
        
        const { User: UserModel } = await import('../models/user.model');
        const consumerUser = consumer?.userId 
            ? await UserModel.findById(consumer.userId).lean() as any
            : null;
        const providerUser = provider?.userId 
            ? await UserModel.findById(provider.userId).lean() as any
            : null;

        let dispute = null;
        if (booking.disputeId) {
            dispute = await Dispute.findById(booking.disputeId).lean();
        }

        return {
            ...booking,
            consumer: {
                _id: consumer?._id,
                name: `${consumer?.firstName || ''} ${consumer?.lastName || ''}`.trim() || 'Unknown',
                phone: consumerUser?.consumerPhone || '',
                email: consumerUser?.consumerEmail || '',
            },
            provider: {
                _id: provider?._id,
                name: `${provider?.firstName || ''} ${provider?.lastName || ''}`.trim() || 'Unknown',
                phone: providerUser?.providerPhone || '',
                email: providerUser?.providerEmail || '',
                serviceType: provider?.serviceType,
            },
            dispute: dispute ? {
                ...dispute,
                raisedByLabel: dispute.raisedBy === 'customer' ? 'Consumer' : 'Provider',
            } : null,
        };
    }

    public async getDisputeById(id: string) {
        const dispute = await Dispute.findById(id).lean();
        if (!dispute) return null;

        const booking = await Booking.findById(dispute.bookingId).lean();
        
        let consumerData = null;
        let providerData = null;
        
        if (booking) {
            const consumer = await Consumer.findById(booking.consumerId).lean();
            const provider = await Provider.findById(booking.providerId).lean();
            
            const { User: UserModel } = await import('../models/user.model');
            
            if (consumer) {
                const consumerUser = consumer.userId 
                    ? await UserModel.findById(consumer.userId).lean() as any 
                    : null;
                consumerData = {
                    _id: consumer._id.toString(),
                    name: `${consumer.firstName || ''} ${consumer.lastName || ''}`.trim() || 'Unknown',
                    phone: consumerUser?.consumerPhone || '',
                    email: consumerUser?.consumerEmail || '',
                };
            }
            
            if (provider) {
                const providerUser = provider.userId 
                    ? await UserModel.findById(provider.userId).lean() as any 
                    : null;
                providerData = {
                    _id: provider._id.toString(),
                    name: `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || 'Unknown',
                    phone: providerUser?.providerPhone || '',
                    email: providerUser?.providerEmail || '',
                    serviceType: provider.serviceType,
                };
            }
        }

        return {
            ...dispute,
            booking: booking ? {
                _id: booking._id.toString(),
                serviceName: booking.serviceName,
                serviceType: booking.serviceType,
                price: booking.price,
                status: booking.status,
                scheduledAt: booking.scheduledAt,
                createdAt: booking.createdAt,
            } : null,
            consumer: consumerData,
            provider: providerData,
            raisedByLabel: dispute.raisedBy === 'customer' ? 'Consumer' : 'Provider',
        };
    }

    public async adminCancelBooking(bookingId: string, adminId: string, reason: string) {
        const booking = await Booking.findById(bookingId);
        if (!booking) throw new BadRequestException("Booking not found");

        booking.status = BookingStatus.CANCELLED;
        booking.cancelledAt = new Date();
        booking.cancelMessage = reason;
        await booking.save();

        await this.logAdminAction(adminId, 'booking', bookingId, 'cancelled', reason);
        return booking;
    }

    public async adminRefundBooking(bookingId: string, adminId: string, reason: string) {
        const booking = await Booking.findById(bookingId);
        if (!booking) throw new BadRequestException("Booking not found");

        if (booking.paymentStatus !== PaymentStatus.HELD && booking.paymentStatus !== PaymentStatus.AUTHORIZED) {
            throw new BadRequestException("Cannot refund - payment not in escrow");
        }

        booking.paymentStatus = PaymentStatus.REFUNDED;
        booking.status = BookingStatus.CANCELLED_REFUNDED;
        booking.refundedAt = new Date();
        await booking.save();

        await this.logAdminAction(adminId, 'booking', bookingId, 'refunded', reason);
        return booking;
    }

    public async adminCompleteBooking(bookingId: string, adminId: string, reason: string) {
        const booking = await Booking.findById(bookingId);
        if (!booking) throw new BadRequestException("Booking not found");

        booking.status = BookingStatus.COMPLETED;
        booking.completedAt = new Date();
        booking.paymentStatus = PaymentStatus.RELEASED;
        await booking.save();

        await this.logAdminAction(adminId, 'booking', bookingId, 'manually_completed', reason);
        return booking;
    }

    public async adminResolveDispute(bookingId: string, adminId: string, resolution: string, adminNotes: string) {
        const booking = await Booking.findById(bookingId);
        if (!booking) throw new BadRequestException("Booking not found");

        if (booking.disputeId) {
            const dispute = await Dispute.findById(booking.disputeId);
            if (dispute) {
                dispute.resolution = resolution as DisputeResolution;
                dispute.resolvedAt = new Date();
                dispute.adminNotes = adminNotes;
                await dispute.save();
            }
        }

        booking.isDisputed = false;
        booking.disputeId = undefined;
        await booking.save();

        await this.logAdminAction(adminId, 'booking', bookingId, `dispute_resolved_${resolution}`, adminNotes);
        return booking;
    }

    private async logAdminAction(adminId: string, targetType: string, targetId: string, action: string, notes: string) {
        await AuditLog.create({
            actorId: adminId,
            actorType: 'admin',
            action: `admin_${action}`,
            targetType,
            targetId,
            outcome: 'success',
            details: { notes },
        });
    }

    private buildQuery(query: any) {
        const filter: any = {};
        if (query.startDate || query.endDate) {
            filter.createdAt = {};
            if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
            if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
        }
        return filter;
    }

    public async exportData(resource: string, query: any) {
        const limit = Math.min(5000, Number(query.limit || 1000));
        const filter = this.buildQuery(query);
        let rows: any[] = [];
        let filename = 'export.csv';
        let headers: string[] = [];
        let keys: string[] = [];

        switch (resource) {
            case 'bookings':
                rows = await Booking.find(filter).limit(limit).lean();
                filename = `bookings-export-${Date.now()}.csv`;
                headers = [
                    'Booking ID',
                    'Consumer ID',
                    'Provider ID',
                    'Service',
                    'Service Name',
                    'Service Type',
                    'Status',
                    'Payment Status',
                    'Payout Status',
                    'Total Price',
                    'Platform Fee',
                    'Scheduled At',
                    'Created At',
                ];
                keys = [
                    '_id',
                    'consumerId',
                    'providerId',
                    'service',
                    'serviceName',
                    'serviceType',
                    'status',
                    'paymentStatus',
                    'payoutStatus',
                    'price.total',
                    'price.platformFee',
                    'scheduledAt',
                    'createdAt',
                ];
                break;
            case 'users':
                rows = await User.find(filter).limit(limit).lean();
                filename = `users-export-${Date.now()}.csv`;
                headers = [
                    'User ID',
                    'Consumer Phone',
                    'Provider Phone',
                    'Consumer Email',
                    'Provider Email',
                    'Consumer Email Verified',
                    'Provider Email Verified',
                    'Active Roles',
                    'Created At',
                ];
                keys = [
                    '_id',
                    'consumerPhone',
                    'providerPhone',
                    'consumerEmail',
                    'providerEmail',
                    'isConsumerEmailVerified',
                    'isProviderEmailVerified',
                    'activeRoles',
                    'createdAt',
                ];
                break;
            case 'consumers':
                rows = await Consumer.find(filter).limit(limit).lean();
                filename = `consumers-export-${Date.now()}.csv`;
                headers = [
                    'Consumer ID',
                    'User ID',
                    'First Name',
                    'Last Name',
                    'Email',
                    'Phone',
                    'Verified',
                    'Created At',
                ];
                keys = [
                    '_id',
                    'userId',
                    'firstName',
                    'lastName',
                    'email',
                    'phone',
                    'isVerified',
                    'createdAt',
                ];
                break;
            case 'providers':
                rows = await Provider.find(filter).limit(limit).lean();
                filename = `providers-export-${Date.now()}.csv`;
                headers = [
                    'Provider ID',
                    'User ID',
                    'First Name',
                    'Last Name',
                    'Email',
                    'Status',
                    'Service Type',
                    'Available',
                    'Base Price From',
                    'Rating',
                    'Review Count',
                    'Created At',
                ];
                keys = [
                    '_id',
                    'userId',
                    'firstName',
                    'lastName',
                    'email',
                    'status',
                    'serviceType',
                    'isAvailable',
                    'basePriceFrom',
                    'rating',
                    'reviewCount',
                    'createdAt',
                ];
                break;
            case 'disputes':
                rows = await Dispute.find(filter).limit(limit).lean();
                filename = `disputes-export-${Date.now()}.csv`;
                headers = [
                    'Dispute ID',
                    'Booking ID',
                    'Raised By',
                    'Reason',
                    'Resolution',
                    'Resolved At',
                    'Created At',
                ];
                keys = [
                    '_id',
                    'bookingId',
                    'raisedBy',
                    'reason',
                    'resolution',
                    'resolvedAt',
                    'createdAt',
                ];
                break;
            case 'audit-logs':
                rows = await AuditLog.find(filter).limit(limit).lean();
                filename = `audit-logs-export-${Date.now()}.csv`;
                headers = [
                    'Log ID',
                    'Actor Type',
                    'Actor ID',
                    'Action',
                    'Target Type',
                    'Target ID',
                    'Outcome',
                    'Details',
                    'Created At',
                ];
                keys = [
                    '_id',
                    'actorType',
                    'actorId',
                    'action',
                    'targetType',
                    'targetId',
                    'outcome',
                    'details',
                    'createdAt',
                ];
                break;
            default:
                throw new BadRequestException(`Unsupported export resource: ${resource}`);
        }

        const normalizedRows = rows.map((row) => {
            const entry: any = {};
            for (const key of keys) {
                if (key.includes('.')) {
                    const [parent, child] = key.split('.');
                    entry[key] = row[parent]?.[child];
                } else {
                    entry[key] = row[key];
                }
            }
            return entry;
        });

        return {
            filename,
            contentType: 'text/csv',
            content: this.buildCsv(normalizedRows, headers, keys),
        };
    }

    public subscribeToUpdates(callback: () => void) {
        const listener = () => callback();
        this.on('update', listener);
        return () => this.off('update', listener);
    }

    public async getAllAdmins() {
        const admins = await getAllAdmins();
        return admins;
    }

    public async createAdmin(data: {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
        role: AdminRole;
    }) {
        const existingAdmin = await checkEmailExists(data.email);
        if (existingAdmin) {
            throw new BadRequestException("Email already exists");
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const admin = await createAdminModel({
            email: data.email.toLowerCase(),
            password: hashedPassword,
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role,
            isActive: true
        });

        return {
            _id: admin._id,
            email: admin.email,
            role: admin.role,
            firstName: admin.firstName,
            lastName: admin.lastName,
            isActive: admin.isActive,
            createdAt: admin.createdAt,
            lastLoginAt: admin.lastLoginAt
        };
    }

    public async updateAdmin(id: string, data: {
        role?: AdminRole;
        firstName?: string;
        lastName?: string;
        isActive?: boolean;
    }) {
        const admin = await updateAdminById(id, data);
        if (!admin) {
            throw new NotFoundException("Admin not found");
        }

        return {
            _id: admin._id,
            email: admin.email,
            role: admin.role,
            firstName: admin.firstName,
            lastName: admin.lastName,
            isActive: admin.isActive,
            createdAt: admin.createdAt,
            lastLoginAt: admin.lastLoginAt
        };
    }

    public async toggleAdminStatus(id: string) {
        const admin = await updateAdminById(id, {});
        if (!admin) {
            throw new NotFoundException("Admin not found");
        }

        const newStatus = !admin.isActive;

        if (admin.role === 'super-admin' && !newStatus) {
            const superAdminCount = await countSuperAdmins();
            if (superAdminCount <= 1) {
                throw new BadRequestException("Cannot deactivate the last super-admin");
            }
        }

        const updatedAdmin = await updateAdminById(id, { isActive: newStatus });
        if (!updatedAdmin) {
            throw new NotFoundException("Admin not found");
        }

        return {
            _id: updatedAdmin._id,
            email: updatedAdmin.email,
            role: updatedAdmin.role,
            firstName: updatedAdmin.firstName,
            lastName: updatedAdmin.lastName,
            isActive: updatedAdmin.isActive,
            createdAt: updatedAdmin.createdAt,
            lastLoginAt: updatedAdmin.lastLoginAt
        };
    }
}

export const AdminService = new AdminServiceClass();
