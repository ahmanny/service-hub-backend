import axios, { AxiosInstance } from "axios";
import mongoose from "mongoose";
import { Booking } from "../models/booking.model";
import { FinancialLedger } from "../models/financial-ledger.model";
import { Payment } from "../models/payment.model";
import { Transaction } from "../models/transaction.model";
import { Wallet } from "../models/wallet.model";
import { BookingStatus, FinancialStatus, LedgerEntryType, PaymentStatus, PayoutStatus } from "../types/booking.types";
import Exception from "../exceptions/Exception";
import { User } from "../models/user.model";
import { NotificationService } from "./notifications.service";
import { WalletService } from "./wallet/wallet.service";


class PaymentServiceClass {
    private readonly baseUrl = 'https://api.paystack.co';
    private readonly secretKey = process.env.PAYSTACK_SECRET_KEY;
    private readonly client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                Authorization: `Bearer ${this.secretKey}`,
                "Content-Type": "application/json",
            },
        });
    }

    /**
     * Helper to wrap all requests with error handling
     */
    private async request(method: 'get' | 'post', endpoint: string, data?: any) {
        try {
            const response = await this.client[method](endpoint, data);

            if (!response.data.status) {
                throw new Exception(response.data.message || "Paystack operation failed");
            }

            return response.data.data;
        } catch (error: any) {
            const message = error.response?.data?.message || "Communication with Paystack failed";
            throw new Exception(message);
        }
    }


    /**
     * Initialize a Paystack payment for a booking.
     * Called after provider accepts.
     */
    public async initializePayment({
        bookingId,
        userId,
        consumerId,
    }: {
        bookingId: string;
        userId: string;
        consumerId: string;
    }) {
        const booking = await Booking.findOne({
            _id: bookingId,
            consumerId,
        });

        if (!booking) throw new Exception("Booking not found for this consumer");
        if (booking.status !== BookingStatus.ACCEPTED) {
            throw new Exception("Payment can only be initialized for accepted bookings");
        }
        if ([PaymentStatus.HELD, PaymentStatus.RELEASED, PaymentStatus.REFUNDED].includes(booking.paymentStatus)) {
            throw new Exception("This booking has already been paid");
        }

        const existingPayment = await Payment.findOne({
            bookingId,
            status: { $in: [PaymentStatus.PENDING, PaymentStatus.HELD, PaymentStatus.RELEASED] },
        }).sort({ createdAt: -1 });

        if (existingPayment?.status === PaymentStatus.PENDING) {
            throw new Exception("Payment has already been initialized for this booking");
        }

        const amountKobo = Math.round(booking.price.total * 100);
        const reference = `proxxi_${bookingId}_${Date.now()}`;

        const consumerEmail = await User.findById(userId).then(user => user?.consumerEmail);
        if (!consumerEmail) throw new Exception("Consumer email not found");

        const data = await this.request('post', "/transaction/initialize", {
            email: consumerEmail,
            amount: amountKobo,
            reference,
            metadata: { bookingId, consumerId },
            channels: ["card", "bank", "ussd", "bank_transfer"],
        });
        // Save payment record
        await Payment.create({
            bookingId,
            reference,
            amount: amountKobo / 100,
            status: "pending",
        });

        return {
            authorizationUrl: data.authorization_url,
            reference,
        };
    }

    /**
     * Verify payment and update booking to HELD (escrow).
     * Called from webhook after charge.success event.
     */
    public async handlePaymentSuccess(reference: string) {
        const data = await this.request('get', `/transaction/verify/${reference}`);

        if (data.status !== "success") {
            throw new Exception("Payment has not been completed successfully");
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const payment = await Payment.findOne({ reference }).session(session);
            if (!payment) throw new Exception("Payment record not found in database");

            if (
                payment.status === PaymentStatus.HELD &&
                payment.financialStatus === FinancialStatus.PENDING_EARNING
            ) {
                await session.commitTransaction();
                return payment;
            }

            const booking = await Booking.findOne({
                _id: payment.bookingId,
                status: BookingStatus.ACCEPTED,
            }).session(session);

            if (!booking) {
                throw new Exception("Booking is no longer payable");
            }

            const expectedAmount = Math.round(payment.amount * 100);
            if (data.amount !== expectedAmount) {
                throw new Exception("Payment amount does not match booking total");
            }
            if (data.currency && data.currency !== "NGN") {
                throw new Exception("Invalid payment currency");
            }

            payment.status = PaymentStatus.HELD;
            payment.financialStatus = FinancialStatus.ESCROW_HELD;
            payment.paidAt = new Date();
            await payment.save({ session });

booking.paymentStatus = PaymentStatus.HELD;
            await booking.save({ session });

            await WalletService.createPendingEarningFromEscrow({
                booking: booking.toObject(),
                paymentId: payment._id,
                paymentReference: payment.reference,
                session,
            });

            await session.commitTransaction();

            NotificationService.sendByProfile(
                'provider',
                booking.providerId.toString(),
                "Payment Received! ✅",
                `Payment confirmed for your booking. You're all set to proceed.`,
                {
                    bookingId: booking._id.toString(),
                    type: "PAYMENT_CONFIRMED",
                    screen: "BookingDetails"
                }
            ).catch(err => console.error("Payment notification error:", err));

            // Also notify consumer to confirm payment went through
            NotificationService.sendByProfile(
                'consumer',
                booking.consumerId.toString(),
                "Payment Successful! 🎉",
                `Your payment is secured. Your booking is now confirmed.`,
                {
                    bookingId: booking._id.toString(),
                    type: "PAYMENT_SUCCESS",
                    screen: "BookingDetails"
                }
            ).catch(err => console.error("Consumer payment notification error:", err));

            return payment;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Release payment to provider after job is confirmed complete.
     * Called when booking moves to COMPLETED.
     */
    public async releaseToProvider(bookingId: string) {
        const payment = await Payment.findOne({ bookingId, status: "held" });
        if (!payment) throw new Exception("No held payment found for this booking");
        if (payment.financialStatus === FinancialStatus.RELEASED) return payment;
        if (payment.financialStatus !== FinancialStatus.AVAILABLE) {
            throw new Exception("Funds are not available for payout");
        }

        const payoutLock = await Booking.findOneAndUpdate(
            {
                _id: bookingId,
                payoutStatus: PayoutStatus.AVAILABLE,
            },
            { $set: { payoutStatus: PayoutStatus.PROCESSING } },
            { new: true }
        );

        if (!payoutLock) {
            const latestPayment = await Payment.findOne({ bookingId });
            if (latestPayment?.financialStatus === FinancialStatus.RELEASED) return latestPayment;
            throw new Exception("Payout is already being processed or is not available");
        }

        // Get provider's recipient code (set during provider onboarding)
        const booking = await Booking.findById(bookingId).populate("providerId");
        const provider = booking?.providerId as any;

        // If provider hasn't set up bank details, move to their internal wallet
        if (!provider?.paystackRecipientCode) {
            await Booking.findByIdAndUpdate(bookingId, {
                payoutStatus: PayoutStatus.AVAILABLE,
            });
            return payment;
        }

        // Transfer from Paystack Balance to Provider Bank
        let data: any;
        try {
            data = await this.request('post', "/transfer", {
                source: "balance",
                amount: Math.round(payment.amount * 100), // Ensure it's an integer
                recipient: provider.paystackRecipientCode,
                reason: `Proxxi payout for booking ${bookingId}`,
            });
        } catch (error) {
            await Booking.findByIdAndUpdate(bookingId, {
                payoutStatus: PayoutStatus.AVAILABLE,
            });
            throw error;
        }

        payment.status = PaymentStatus.RELEASED;
        payment.financialStatus = FinancialStatus.RELEASED;
        payment.transferCode = data.transfer_code;
        await payment.save();

        await FinancialLedger.updateOne(
            { idempotencyKey: `${bookingId}:${LedgerEntryType.RELEASE_TO_PROVIDER}` },
            {
                $setOnInsert: {
                    bookingId,
                    providerId: provider._id,
                    paymentId: payment._id,
                    entryType: LedgerEntryType.RELEASE_TO_PROVIDER,
                    fromStatus: FinancialStatus.AVAILABLE,
                    toStatus: FinancialStatus.RELEASED,
                    amount: payment.amount,
                    currency: "NGN",
                    idempotencyKey: `${bookingId}:${LedgerEntryType.RELEASE_TO_PROVIDER}`,
                    reference: data.transfer_code,
                },
            },
            { upsert: true }
        );

        await Booking.findByIdAndUpdate(bookingId, {
            paymentStatus: PaymentStatus.RELEASED,
            payoutStatus: PayoutStatus.COMPLETED,
        });

        return payment;
    }

    /**
     * Refund consumer — called when dispute is resolved in consumer's favor.
     */
    public async refundConsumer(bookingId: string) {
        const payment = await Payment.findOne({ bookingId, status: "held" });
        if (!payment) throw new Exception("No held payment found to refund");
        if (payment.financialStatus === FinancialStatus.REFUNDED) return payment;
        const previousFinancialStatus = payment.financialStatus;

        await this.request('post', "/refund", {
            transaction: payment.reference,
        });

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            payment.status = PaymentStatus.REFUNDED;;
            payment.financialStatus = FinancialStatus.REFUNDED;
            await payment.save({ session });

            const booking = await Booking.findById(bookingId).session(session);
            if (!booking) throw new Exception("Booking not found for refund");

            const txn = await Transaction.findOneAndUpdate(
                {
                    bookingId,
                    purpose: "booking_revenue",
                    type: "credit",
                    status: { $in: ["pending", "completed"] },
                },
                { $set: { status: "reversed" } },
                { new: false, session }
            );

            if (txn) {
                const walletDelta = txn.status === "completed"
                    ? { availableBalance: -txn.amount, totalEarned: -txn.amount }
                    : { pendingBalance: -txn.amount };

                await Wallet.updateOne(
                    { _id: txn.walletId },
                    { $inc: walletDelta },
                    { session }
                );
            }

            await FinancialLedger.updateOne(
                { idempotencyKey: `${bookingId}:${LedgerEntryType.REFUND}` },
                {
                    $setOnInsert: {
                        bookingId,
                        providerId: booking.providerId,
                        paymentId: payment._id,
                        entryType: LedgerEntryType.REFUND,
                        fromStatus: previousFinancialStatus,
                        toStatus: FinancialStatus.REFUNDED,
                        amount: payment.amount,
                        currency: "NGN",
                        idempotencyKey: `${bookingId}:${LedgerEntryType.REFUND}`,
                        reference: payment.reference,
                    },
                },
                { upsert: true, session }
            );

            await Booking.findByIdAndUpdate(bookingId, {
                paymentStatus: PaymentStatus.REFUNDED,
                payoutStatus: PayoutStatus.PENDING,
            }, { session });

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

        return payment;
    }

    /**
 * Creates a transfer recipient on Paystack.
 * Required before you can send money to a provider.
 */
    public async createTransferRecipient(accountName: string, accountNumber: string, bankCode: string) {
        return await this.request('post', "/transferrecipient", {
            type: "nuban",
            name: accountName,
            account_number: accountNumber,
            bank_code: bankCode,
            currency: "NGN",
        });
    }
}

export const PaymentService = new PaymentServiceClass();
