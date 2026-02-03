import { Booking } from "../../models/booking.model";
import { Types } from "mongoose";
import dayjs from "dayjs";

class EarningsServiceClass {
    public async getProviderEarnings(providerId: string) {
        const pId = new Types.ObjectId(providerId);

        //  Get ALL Completed Bookings for "All Time" stats
        // This ensures jobsCompleted and total calculations are accurate
        const allCompletedBookings = await Booking.find({
            providerId: pId,
            status: 'completed'
        })
            .populate("consumerId", "firstName lastName")
            .sort({ completedAt: -1 }); // Newest first

        // Calculations
        // Jobs Completed: All time
        const jobsCompleted = allCompletedBookings.length;

        // Total Earnings: Let's make this "Total Lifetime Earnings" or "This Month"
        // For your UI "Total Monthly", we filter the all-time list in memory:
        const startOfMonth = dayjs().startOf('month');
        const totalMonthly = allCompletedBookings
            .filter(b => dayjs(b.completedAt).isAfter(startOfMonth))
            .reduce((acc, curr) => acc + (curr.price.total - (curr.price.platformFee || 0)), 0);

        const avgPerJob = jobsCompleted > 0
            ? allCompletedBookings.reduce((acc, curr) => acc + (curr.price.total - (curr.price.platformFee || 0)), 0) / jobsCompleted
            : 0;

        // Transactions Mapping
        const transactions = allCompletedBookings.map(b => ({
            id: b._id,
            title: b.serviceName,
            client: (b.consumerId as any)?.firstName + " " + (b.consumerId as any)?.lastName,
            net: b.price.total - (b.price.platformFee || 0),
            fee: b.price.platformFee || 0,
            date: dayjs(b.completedAt).format('DD MMM'),
            status: 'Completed'
        })).slice(0, 10);

        //  Chart Data (Last 7 Days)
        const chartData = await this.getChartData(pId);

        return {
            totalMonthly,
            growth: 0,
            jobsCompleted,
            avgPerJob,
            availableBalance: totalMonthly,
            pendingBalance: 0,
            nextPayout: "Friday • 6:00 PM",
            chartData,
            transactions
        };
    }

    private async getChartData(providerId: Types.ObjectId) {
        const sevenDaysAgo = dayjs().subtract(6, 'days').startOf('day').toDate();

        const stats = await Booking.aggregate([
            {
                $match: {
                    providerId,
                    status: 'completed',
                    completedAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
                    dailyNet: { $sum: { $subtract: ["$price.total", "$price.platformFee"] } }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const dateObj = dayjs().subtract(6 - i, 'days');
            const dateStr = dateObj.format('YYYY-MM-DD');
            const dayData = stats.find(s => s._id === dateStr);

            return dayData ? dayData.dailyNet : 0;
        });

        return last7Days;
    }
}

export const EarningsService = new EarningsServiceClass();