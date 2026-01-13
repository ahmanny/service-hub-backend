import cron from "node-cron";
import { BookingService } from "../services/booking.service";

export const initCronJobs = () => {
    // Run every 10 minutes 
    cron.schedule("*/10 * * * *", async () => {
        try {
            console.log("⏱️  Running scheduled booking expiration check...");
            await BookingService.cleanupExpiredBookings();
        } catch (error) {
            console.error("Critical: Cron job failed", error);
        }
    });

    console.log("Booking Cron Jobs Initialized");
};