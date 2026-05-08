import { Request, RequestHandler, Response } from "express";
import { error_handler, ok_handler } from "../../utils/response_handler";
import UnauthorizedAccessException from "../../exceptions/UnauthorizedAccessException";
import BadRequestException from "../../exceptions/BadRequestException";
import { Wallet } from "../../models/wallet.model";
import { Transaction } from "../../models/transaction.model";
import { Provider } from "../../models/provider.model";
import { NotificationService } from "../../services/notifications.service";
import { Types } from "mongoose";

export const createWithdrawal = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.providerProfile) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const providerId = req.providerProfile._id;
            const { amount } = req.body;

            if (!amount || typeof amount !== "number" || amount <= 0) {
                throw new BadRequestException("Invalid amount. Please enter a valid amount.");
            }

            const provider = await Provider.findById(providerId).populate("userId");
            if (!provider) {
                throw new BadRequestException("Provider profile not found");
            }

            if (!provider.payoutDetails || !provider.payoutDetails.accountNumber) {
                throw new BadRequestException("Payout details not set up. Please add your bank account first.");
            }

            const wallet = await Wallet.findOne({ providerId });
            if (!wallet) {
                throw new BadRequestException("Wallet not found");
            }

            if (amount > wallet.availableBalance) {
                throw new BadRequestException(`Insufficient balance. Available: ₦${wallet.availableBalance.toLocaleString()}`);
            }

            const minWithdrawal = 1000;
            if (amount < minWithdrawal) {
                throw new BadRequestException(`Minimum withdrawal amount is ₦${minWithdrawal.toLocaleString()}`);
            }

            const reference = `WD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            
            const payout = provider.payoutDetails;
            const maskedAccount = payout.accountNumber.slice(-4);

            const transaction = new Transaction({
                providerId: new Types.ObjectId(providerId.toString()),
                walletId: wallet._id,
                amount: amount,
                type: "debit",
                purpose: "withdrawal",
                status: "pending",
                description: `Withdrawal request to ${payout.bankName} ****${maskedAccount}`,
                reference: reference,
                metadata: {
                    bankName: payout.bankName,
                    accountNumber: payout.accountNumber,
                    accountName: payout.accountName,
                },
            });

            await transaction.save();

            // Send notification to provider
            try {
                const userId = provider.userId?._id?.toString() || provider.userId?.toString();
                if (userId) {
                    await NotificationService.sendToUser(
                        userId,
                        "Withdrawal Request Submitted 💰",
                        "provider",
                        `Your withdrawal of ₦${Number(amount).toLocaleString()} is pending approval.`,
                        { type: "withdrawal", screen: "Withdraw", status: "pending" }
                    );
                }
            } catch (notifyErr) {
                console.error("Withdrawal notification error (non-blocking):", notifyErr);
            }

            ok_handler(res, "Withdrawal request created successfully", {
                withdrawal: {
                    _id: transaction._id,
                    amount: transaction.amount,
                    status: transaction.status,
                    reference: transaction.reference,
                    description: transaction.description,
                    createdAt: transaction.createdAt,
                }
            });
        } catch (error) {
            error_handler(error, req, res);
        }
    }
}

export const getWithdrawalHistory = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.providerProfile) {
                throw new UnauthorizedAccessException("Unauthorized");
            }

            const providerId = req.providerProfile._id;
            const { page = 1, limit = 20 } = req.query;

            const skip = (Number(page) - 1) * Number(limit);

            const transactions = await Transaction.find({
                providerId: new Types.ObjectId(providerId.toString()),
                purpose: "withdrawal",
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean();

            const total = await Transaction.countDocuments({
                providerId: new Types.ObjectId(providerId.toString()),
                purpose: "withdrawal",
            });

            ok_handler(res, "Withdrawal history fetched successfully", {
                withdrawals: transactions,
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