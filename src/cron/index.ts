import cron from "node-cron";
import { BookingService } from "../services/booking.service";
import { WalletJobService } from "../services/wallet/wallet.job";

export const initCronJobs = () => {
  /**
   * BOOKING JOBS
   */
  // Cleanup Expired: Every 10 mins
  cron.schedule("*/10 * * * *", async () => {
    try {
      console.log("⏱️  Running expiration check...");
      await BookingService.cleanupExpiredBookings();
    } catch (e) { console.error("Cron Error (Cleanup):", e); }
  });

  // Zombie Check: Every 5 mins
  cron.schedule("*/5 * * * *", async () => {
    try {
      console.log("🧟 Checking for zombie bookings...");
      await BookingService.processAcceptedZombies();
    } catch (e) { console.error("Cron Error (Zombies):", e); }
  });

  /**
   * WALLET & FINTECH JOBS
   */
  // Settle Funds (Move from Pending to Available): Every 15 mins
  cron.schedule("*/15 * * * *", async () => {
    try {
      console.log("💰 Running Wallet Settlement Job...");
      await WalletJobService.processMatureTransactions();
    } catch (e) { console.error("Cron Error (Settlement):", e); }
  });

  console.log("🚀 All System Cron Jobs Initialized");
};