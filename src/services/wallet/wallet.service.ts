import { Wallet } from "../../models/wallet.model";
import { Transaction } from "../../models/transaction.model";
import mongoose, { Types } from "mongoose";
import { FinancialLedger } from "../../models/financial-ledger.model";
import { Payment } from "../../models/payment.model";
import { Booking } from "../../models/booking.model";
import { FinancialStatus, LedgerEntryType, PayoutStatus } from "../../types/booking.types";
import ResourceNotFoundException from "../../exceptions/ResourceNotFoundException";

class WalletServiceClass {
    /**
     * Credit provider pending earnings as soon as payment is confirmed in escrow.
     * This operation is idempotent per booking.
     */
    public async createPendingEarningFromEscrow(payload: {
        booking: any;
        paymentId: Types.ObjectId;
        paymentReference: string;
        session?: mongoose.ClientSession;
    }) {
        const { booking, paymentId, paymentReference, session } = payload;
        const pId = new Types.ObjectId(booking.providerId);
        const netAmount = booking.price.total - (booking.price.platformFee || 0);

        const wallet = await Wallet.findOneAndUpdate(
            { providerId: pId },
            {
                $setOnInsert: {
                    providerId: pId,
                    availableBalance: 0,
                    pendingBalance: 0,
                    totalEarned: 0,
                    currency: "NGN",
                },
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
                session,
            }
        );

        await this.createLedgerEntry({
            bookingId: booking._id,
            providerId: pId,
            paymentId,
            walletId: wallet._id,
            entryType: LedgerEntryType.CREDIT_ESCROW,
            toStatus: FinancialStatus.ESCROW_HELD,
            amount: booking.price.total,
            reference: paymentReference,
            session,
        });

        await this.createLedgerEntry({
            bookingId: booking._id,
            providerId: pId,
            paymentId,
            walletId: wallet._id,
            entryType: LedgerEntryType.CREDIT_PENDING,
            fromStatus: FinancialStatus.ESCROW_HELD,
            toStatus: FinancialStatus.PENDING_EARNING,
            amount: netAmount,
            reference: paymentReference,
            session,
        });

        const result = await Transaction.updateOne(
            {
                bookingId: booking._id,
                purpose: "booking_revenue",
                type: "credit",
            },
            {
                $setOnInsert: {
                    walletId: wallet._id,
                    providerId: pId,
                    bookingId: booking._id,
                    amount: netAmount,
                    type: "credit",
                    status: "pending",
                    purpose: "booking_revenue",
                    reference: `BOOKING-${booking._id}-REVENUE`,
                    description: `Pending payment for ${booking.serviceName}`,
                },
            },
            { upsert: true, session }
        );

        if (result.upsertedCount > 0) {
            wallet.pendingBalance += netAmount;
            await wallet.save({ session });
        }

        await Payment.findByIdAndUpdate(
            paymentId,
            { financialStatus: FinancialStatus.PENDING_EARNING },
            { session }
        );
    }

    /**
     * Move escrowed provider earnings from pending to available after the
     * booking's dispute deadline passes. Idempotent per booking.
     */
    public async movePendingToAvailable(booking: any, session?: mongoose.ClientSession) {
        const txn = await Transaction.findOneAndUpdate(
            {
                bookingId: booking._id,
                providerId: booking.providerId,
                purpose: "booking_revenue",
                type: "credit",
                status: "pending",
            },
            { $set: { status: "completed" } },
            { new: true, session }
        );

        if (!txn) {
            const completed = await Transaction.findOne({
                bookingId: booking._id,
                providerId: booking.providerId,
                purpose: "booking_revenue",
                type: "credit",
                status: "completed",
            }).session(session || null);

            if (completed) return completed;
            throw new ResourceNotFoundException("Pending earning not found for booking");
        }

        const wallet = await Wallet.findById(txn.walletId).session(session || null);
        if (!wallet) throw new ResourceNotFoundException("Wallet not found");

        wallet.pendingBalance = Math.max(0, wallet.pendingBalance - txn.amount);
        wallet.availableBalance += txn.amount;
        wallet.totalEarned += txn.amount;
        await wallet.save({ session });

        const payment = await Payment.findOne({ bookingId: booking._id }).session(session || null);
        await this.createLedgerEntry({
            bookingId: booking._id,
            providerId: booking.providerId,
            paymentId: payment?._id,
            walletId: wallet._id,
            entryType: LedgerEntryType.MOVE_PENDING_TO_AVAILABLE,
            fromStatus: FinancialStatus.PENDING_EARNING,
            toStatus: FinancialStatus.AVAILABLE,
            amount: txn.amount,
            reference: txn.reference,
            session,
        });

        await Payment.updateOne(
            { bookingId: booking._id },
            { financialStatus: FinancialStatus.AVAILABLE },
            { session }
        );

        await Booking.updateOne(
            { _id: booking._id },
            { payoutStatus: PayoutStatus.AVAILABLE },
            { session }
        );

        return txn;
    }

    public async holdForDispute(booking: any, session?: mongoose.ClientSession) {
        const txn = await Transaction.findOne({
            bookingId: booking._id,
            providerId: booking.providerId,
            purpose: "booking_revenue",
            type: "credit",
        }).session(session || null);

        const payment = await Payment.findOne({ bookingId: booking._id }).session(session || null);

        await this.createLedgerEntry({
            bookingId: booking._id,
            providerId: booking.providerId,
            paymentId: payment?._id,
            walletId: txn?.walletId,
            entryType: LedgerEntryType.DISPUTE_HOLD,
            fromStatus: FinancialStatus.PENDING_EARNING,
            toStatus: FinancialStatus.DISPUTED,
            amount: txn?.amount || booking.price.total,
            reference: txn?.reference || payment?.reference,
            session,
        });

        await Payment.updateOne(
            { bookingId: booking._id },
            { financialStatus: FinancialStatus.DISPUTED },
            { session }
        );
    }

    private async createLedgerEntry(payload: {
        bookingId: Types.ObjectId;
        providerId: Types.ObjectId;
        paymentId?: Types.ObjectId;
        walletId?: Types.ObjectId;
        entryType: LedgerEntryType;
        fromStatus?: FinancialStatus;
        toStatus: FinancialStatus;
        amount: number;
        reference?: string;
        session?: mongoose.ClientSession;
    }) {
        const idempotencyKey = `${payload.bookingId}:${payload.entryType}`;

        await FinancialLedger.updateOne(
            { idempotencyKey },
            {
                $setOnInsert: {
                    ...payload,
                    idempotencyKey,
                    currency: "NGN",
                },
            },
            { upsert: true, session: payload.session }
        );
    }
}

export const WalletService = new WalletServiceClass();
