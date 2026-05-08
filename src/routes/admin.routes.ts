import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { getBookingDetails } from '../controllers/booking.controller';
import { AuthMiddleware } from '../middlewares';
import { checkAdminPermission } from '../utils/admin-role.util';

const authMiddleware = new AuthMiddleware();

export const adminRoutes = Router();

adminRoutes.get('/dashboard-stream', adminController.streamDashboardStats());

adminRoutes.use(authMiddleware.authorizeRole('admin'));

adminRoutes.get('/dashboard-stats', adminController.getAdminDashboardStats());
adminRoutes.get('/audit-logs', adminController.getAuditLogs());

// Export routes - super-admin and finance only
adminRoutes.get('/export/users', checkAdminPermission('finance'), adminController.exportUsers());
adminRoutes.get('/export/consumers', checkAdminPermission('finance'), adminController.exportConsumers());
adminRoutes.get('/export/providers', checkAdminPermission('finance'), adminController.exportProviders());
adminRoutes.get('/export/bookings', checkAdminPermission('finance'), adminController.exportBookings());
adminRoutes.get('/export/disputes', checkAdminPermission('finance'), adminController.exportDisputes());
adminRoutes.get('/export/audit-logs', checkAdminPermission('finance'), adminController.exportAuditLogs());
adminRoutes.get('/export/:resource', checkAdminPermission('finance'), adminController.exportResource());

// User management - super-admin only
adminRoutes.get('/users', checkAdminPermission('all'), adminController.getAllUsers());
adminRoutes.get('/users/:id', checkAdminPermission('all'), adminController.getUserById());
adminRoutes.patch('/users/:id', checkAdminPermission('all'), adminController.updateUserByAdmin());

// Consumer management - support and above
adminRoutes.get('/consumers', checkAdminPermission('support'), adminController.getAllConsumers());
adminRoutes.get('/consumers/:id', checkAdminPermission('support'), adminController.getConsumerById());
adminRoutes.patch('/consumers/:id', checkAdminPermission('support'), adminController.updateConsumerByAdmin());

// Provider management - support and above
adminRoutes.get('/providers', checkAdminPermission('support'), adminController.getAllProviders());
adminRoutes.get('/providers/:id', checkAdminPermission('support'), adminController.getProviderById());
adminRoutes.patch('/providers/:id', checkAdminPermission('support'), adminController.updateProviderByAdmin());
adminRoutes.post('/providers/:id/approve', checkAdminPermission('finance'), adminController.approveProvider());
adminRoutes.post('/providers/:id/reject', checkAdminPermission('finance'), adminController.rejectProvider());

// Booking management - support and above
adminRoutes.get('/bookings', checkAdminPermission('support'), adminController.getAllBookings());
adminRoutes.get('/bookings/:id', checkAdminPermission('support'), adminController.getBookingById());
adminRoutes.post('/bookings/:id/cancel', checkAdminPermission('finance'), adminController.adminCancelBooking());
adminRoutes.post('/bookings/:id/refund', checkAdminPermission('finance'), adminController.adminRefundBooking());
adminRoutes.post('/bookings/:id/complete', checkAdminPermission('finance'), adminController.adminCompleteBooking());
adminRoutes.post('/bookings/:id/resolve-dispute', checkAdminPermission('finance'), adminController.adminResolveDispute());

// Dispute management - support and above
adminRoutes.get('/disputes', checkAdminPermission('support'), adminController.getAllDisputes());
adminRoutes.get('/disputes/:id', checkAdminPermission('support'), adminController.getDisputeById());
adminRoutes.patch('/disputes/:id', checkAdminPermission('finance'), adminController.resolveDispute());

// Notifications - super-admin only
adminRoutes.post('/notifications/broadcast', checkAdminPermission('all'), adminController.broadcastNotification());

// Admin management - super-admin only
adminRoutes.get('/admins', checkAdminPermission('all'), adminController.getAllAdmins());
adminRoutes.post('/admins', checkAdminPermission('all'), adminController.createAdmin());
adminRoutes.patch('/admins/:id', checkAdminPermission('all'), adminController.updateAdmin());
adminRoutes.post('/admins/:id/toggle-status', checkAdminPermission('all'), adminController.toggleAdminStatus());

// Financial Management - finance and super-admin only
adminRoutes.get('/wallets', checkAdminPermission('finance'), adminController.getAllWallets());
adminRoutes.get('/wallets/:id', checkAdminPermission('finance'), adminController.getWalletById());
adminRoutes.get('/wallet-transactions', checkAdminPermission('finance'), adminController.getAllWalletTransactions());
adminRoutes.get('/payments', checkAdminPermission('finance'), adminController.getAllPayments());
adminRoutes.get('/payments/:id', checkAdminPermission('finance'), adminController.getPaymentById());
adminRoutes.get('/financial-ledger', checkAdminPermission('finance'), adminController.getFinancialLedger());
adminRoutes.get('/financial-summary', checkAdminPermission('finance'), adminController.getFinancialSummary());

// Withdrawals - finance and super-admin only
adminRoutes.get('/withdrawals', checkAdminPermission('finance'), adminController.getAllWithdrawals());
adminRoutes.post('/withdrawals/:id/approve', checkAdminPermission('finance'), adminController.approveWithdrawal());
adminRoutes.post('/withdrawals/:id/reject', checkAdminPermission('finance'), adminController.rejectWithdrawal());