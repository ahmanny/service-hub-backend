import { Booking } from "../../models/booking.model";
import { Types } from "mongoose";
import dayjs from "dayjs";


class EarningsServiceClass {
    constructor() {
        // super()
    }

    public async getProviderEarnings(providerId: string) {
        const pId = new Types.ObjectId(providerId);
        const startOfMonth = dayjs().startOf('month').toDate();

        // Get Completed Bookings for this month
        const monthlyBookings = await Booking.find({
            providerId: pId,
            status: 'completed',
            completedAt: { $gte: startOfMonth }
        }).populate("consumerId", "firstName lastName");

        //  Calculations
        const totalMonthly = monthlyBookings.reduce((acc, curr) => acc + (curr.price.total - (curr.price.platformFee || 0)), 0);
        const jobsCompleted = monthlyBookings.length;
        const avgPerJob = jobsCompleted > 0 ? totalMonthly / jobsCompleted : 0;

        //  Transactions Mapping (Net = Total - PlatformFee)
        const transactions = monthlyBookings.map(b => ({
            id: b._id,
            title: b.serviceName,
            client: (b.consumerId as any)?.firstName + " " + (b.consumerId as any)?.lastName,
            net: b.price.total - (b.price.platformFee || 0),
            fee: b.price.platformFee || 0,
            date: dayjs(b.completedAt).format('DD MMM'),
            status: 'Completed'
        })).reverse().slice(0, 10); // Last 10

        // Chart Data (Last 7 Days)
        const chartData = await this.getChartData(pId);

        return {
            totalMonthly,
            growth: 0, // can calculate this by comparing to last month later
            jobsCompleted,
            avgPerJob,
            availableBalance: totalMonthly, // Logic depends on your payout cycle
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

        // Ensure we return an array of 7 numbers, even if some days have 0 earnings
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const date = dayjs().subtract(6 - i, 'days').format('YYYY-MM-DD');
            const dayData = stats.find(s => s._id === date);
            return dayData ? dayData.dailyNet : 0;
        });

        return last7Days;
    }

}

export const EarningsService = new EarningsServiceClass();
