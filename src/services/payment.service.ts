import axios, { AxiosInstance } from "axios";
import { Booking } from "../models/booking.model";
import { Payment } from "../models/payment.model";
import { PaymentStatus, PayoutStatus } from "../types/booking.types";
import Exception from "../exceptions/Exception";
import { User } from "../models/user.model";


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
        amountKobo, // Paystack uses kobo (100 kobo = 1 naira)
    }: {
        bookingId: string;
        userId: string;
        amountKobo: number;
    }) {
        const reference = `proxxi_${bookingId}_${Date.now()}`;

        const consumerEmail = await User.findById(userId).then(user => user?.consumerEmail);
        if (!consumerEmail) throw new Exception("Consumer email not found");

        const data = await this.request('post', "/transaction/initialize", {
            email: consumerEmail,
            amount: amountKobo,
            reference,
            metadata: { bookingId },
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

        const payment = await Payment.findOne({ reference });
        if (!payment) throw new Exception("Payment record not found in database");

        payment.status = PaymentStatus.HELD;
        payment.paidAt = new Date();
        await payment.save();

        // Update booking payment status
        await Booking.findByIdAndUpdate(payment.bookingId, {
            paymentStatus: PaymentStatus.HELD,
        });

        return payment;
    }

    /**
     * Release payment to provider after job is confirmed complete.
     * Called when booking moves to COMPLETED.
     */
    public async releaseToProvider(bookingId: string) {
        const payment = await Payment.findOne({ bookingId, status: "held" });
        if (!payment) throw new Exception("No held payment found for this booking");

        // Get provider's recipient code (set during provider onboarding)
        const booking = await Booking.findById(bookingId).populate("providerId");
        const provider = booking?.providerId as any;

        // If provider hasn't set up bank details, move to their internal wallet
        if (!provider?.paystackRecipientCode) {
            payment.status = PaymentStatus.RELEASED;
            await payment.save();

            await Booking.findByIdAndUpdate(bookingId, {
                paymentStatus: PaymentStatus.RELEASED,
                payoutStatus: PayoutStatus.AVAILABLE,
            });
            return payment;
        }

        // Transfer from Paystack Balance to Provider Bank
        const data = await this.request('post', "/transfer", {
            source: "balance",
            amount: Math.round(payment.amount * 100), // Ensure it's an integer
            recipient: provider.paystackRecipientCode,
            reason: `Proxxi payout for booking ${bookingId}`,
        });

        payment.status = PaymentStatus.RELEASED;
        payment.transferCode = data.transfer_code;
        await payment.save();

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

        await this.request('post', "/refund", {
            transaction: payment.reference,
        });

        payment.status = PaymentStatus.REFUNDED;;
        await payment.save();

        await Booking.findByIdAndUpdate(bookingId, {
            paymentStatus: PaymentStatus.REFUNDED,
            payoutStatus: PayoutStatus.PENDING,
        });

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