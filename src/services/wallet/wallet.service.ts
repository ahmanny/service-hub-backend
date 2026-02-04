import { Wallet } from "../../models/wallet.model";
import { Transaction } from "../../models/transaction.model";
import mongoose, { Types } from "mongoose";
import dayjs from "dayjs";
import Exception from "../../exceptions/Exception";
import ResourceNotFoundException from "../../exceptions/ResourceNotFoundException";

class WalletServiceClass {
    /**
     * Credit pending balance when job is completed
     * Funds stay pending for 5 hours
     */
    public async handleJobCompletion(booking: any, session?: mongoose.ClientSession) {
        const pId = new Types.ObjectId(booking.providerId);
        const netAmount = booking.price.total - (booking.price.platformFee || 0);
        const clearsAt = dayjs().add(5, "hours").toDate();

        const wallet = await Wallet.findOne({ providerId: pId }).session(session || null);
        if (!wallet) throw new ResourceNotFoundException("Wallet not found");

        // Create Transaction (linked to the session)
        await Transaction.create([{
            walletId: wallet._id,
            providerId: pId,
            bookingId: booking._id,
            amount: netAmount,
            type: "credit",
            status: "pending",
            purpose: "booking_revenue",
            clearsAt: clearsAt,
            reference: `JOB-${booking._id}-${Date.now()}`,
            description: `Payment for ${booking.serviceName}`,
        }], { session });

        // Update Wallet Pending Balance
        wallet.pendingBalance += netAmount;
        await wallet.save({ session });
    }
}

export const WalletService = new WalletServiceClass();