import mongoose from "mongoose";
import { Provider } from "../models/provider.model";
import { Wallet } from "../models/wallet.model";
import { connectDB } from "../configs/db";

const migrateExistingProvidersToWallets = async () => {
    try {
        await connectDB();
        console.log("🚀 Starting Wallet Migration for existing providers...");

        //  Get all providers
        const providers = await Provider.find({});
        console.log(`Found ${providers.length} providers. Checking wallet status...`);

        let createdCount = 0;
        let skippedCount = 0;

        for (const provider of providers) {
            //  Check if wallet already exists to avoid duplicates
            const existingWallet = await Wallet.findOne({ providerId: provider._id });

            if (!existingWallet) {
                //  Create the wallet
                await Wallet.create({
                    providerId: provider._id,
                    availableBalance: 0,
                    pendingBalance: 0,
                    totalEarned: 0,
                    currency: "NGN"
                });
                createdCount++;
            } else {
                skippedCount++;
            }
        }

        console.log("-----------------------------------------");
        console.log(`✅ Migration Complete!`);
        console.log(`🆕 Wallets Created: ${createdCount}`);
        console.log(`⏭️  Already Had Wallets: ${skippedCount}`);
        console.log("-----------------------------------------");

        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
};

migrateExistingProvidersToWallets();