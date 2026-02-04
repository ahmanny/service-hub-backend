import { Transaction } from "../../models/transaction.model";
import { Wallet } from "../../models/wallet.model";
import mongoose from "mongoose";

export class WalletJobService {
    public static async processMatureTransactions() {
        const now = new Date();
        const matureTxns = await Transaction.find({
            status: "pending",
            purpose: "booking_revenue",
            clearsAt: { $lte: now },
        });

        if (matureTxns.length === 0) return;

        console.log(`💸 Settling ${matureTxns.length} mature transactions...`);

        for (const txn of matureTxns) {
            const session = await mongoose.startSession();
            try {
                session.startTransaction();

                const wallet = await Wallet.findById(txn.walletId).session(session);
                if (wallet) {
                    wallet.pendingBalance -= txn.amount;
                    wallet.availableBalance += txn.amount;
                    wallet.totalEarned += txn.amount;
                    await wallet.save({ session });

                    txn.status = "completed";
                    await txn.save({ session });
                }

                await session.commitTransaction();
            } catch (error) {
                await session.abortTransaction();
                console.error(`❌ Settlement failed for Txn ${txn._id}:`, error);
            } finally {
                session.endSession();
            }
        }
    }
}