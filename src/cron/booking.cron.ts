import cron from "node-cron";
import { BookingService } from "../services/booking.service";

export const initCronJobs = () => {
    // Run every 10 minutes 
    cron.schedule("*/2 * * * *", async () => {
        try {
            console.log("⏱️  Running scheduled booking expiration check...");
            await BookingService.cleanupExpiredBookings();
        } catch (error) {
            console.error("Critical: Cron job failed", error);
        }
    });

    cron.schedule("*/5 * * * *", async () => { // Running every 5 mins 
        try {
            console.log("🧟 Checking for accepted bookings that should be in-progress...");
            await BookingService.processAcceptedZombies();
        } catch (error) {
            console.error("Critical: Zombie Cron job failed", error);
        }
    });

    console.log("Booking Cron Jobs Initialized");
};