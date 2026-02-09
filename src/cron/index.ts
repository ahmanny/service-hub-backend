import cron from "node-cron";
import { BookingService } from "../services/booking.service";
import { WalletJobService } from "../services/wallet/wallet.job";

export const initCronJobs = () => {
  /**
   * REMINDER ENGINE
   * Runs every minute to ensure reminders are accurate to the minute.
   */
  cron.schedule("* * * * *", async () => {
    try {
      // Handles 1-hour before reminders
      await BookingService.sendBookingReminders();
    } catch (e) { console.error("Cron Error (Reminders):", e); }
  });

  /**
   * THE STATUS ENFORCER (Zombies & Auto-Starts)
   * Runs every 2 minutes to catch late providers quickly.
   */
  cron.schedule("*/2 * * * *", async () => {
    try {
      // Handles 5-min nudge and 15-min auto-start logic
      await BookingService.processAcceptedZombies();
    } catch (e) { console.error("Cron Error (Zombies):", e); }
  });

  /**
   * THE HOUSEKEEPING (Expiration)
   * Runs every 5 minutes to clear out unaccepted requests.
   */
  cron.schedule("*/5 * * * *", async () => {
    try {
      await BookingService.cleanupExpiredBookings();
    } catch (e) { console.error("Cron Error (Cleanup):", e); }
  });

  /**
   * THE REVENUE & PAYOUT ENGINE
   * Runs every 10 minutes to settle completed jobs.
   */
  cron.schedule("*/10 * * * *", async () => {
    try {
      // Moves COMPLETION_PENDING to COMPLETED after 2-hour dispute window
      await BookingService.processPendingPayouts();
      
      // Moves funds from Pending to Available in provider wallets
      await WalletJobService.processMatureTransactions();
    } catch (e) { console.error("Cron Error (Financials):", e); }
  });

  console.log("System Cron Jobs Initialized");
};