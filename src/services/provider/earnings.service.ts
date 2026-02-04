import { Booking } from "../../models/booking.model";
import { Types } from "mongoose";
import dayjs from "dayjs";
import { Wallet } from "../../models/wallet.model";
import { Transaction } from "../../models/transaction.model";

class EarningsServiceClass {
    public async getProviderEarnings(providerId: string) {
        const pId = new Types.ObjectId(providerId);

        //  Fetch the Wallet 
        const wallet = await Wallet.findOne({ providerId: pId });

        // Get All-Time Completed Jobs Count
        const jobsCompleted = await Booking.countDocuments({
            providerId: pId,
            status: "completed",
        });

        //  Get Recent Ledger Transactions
        const recentTransactions = await Transaction.find({ providerId: pId })
            .sort({ createdAt: -1 })
            .limit(10);

        const transactions = recentTransactions.map((t) => ({
            id: t._id,
            title: t.description,
            net: t.amount,
            status: t.status,
            date: dayjs(t.createdAt).format("DD MMM"),
            type: t.type,
        }));

        // Monthly Earnings (Still aggregated for the stat card)
        const startOfMonth = dayjs().startOf("month").toDate();
        const monthlyStats = await Transaction.aggregate([
            {
                $match: {
                    providerId: pId,
                    status: "completed",
                    purpose: "booking_revenue",
                    createdAt: { $gte: startOfMonth },
                },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        const totalMonthly = monthlyStats[0]?.total || 0;
        const chartData = await this.getChartData(pId);

        return {
            totalMonthly,
            growth: 0,
            jobsCompleted,
            avgPerJob: jobsCompleted > 0 ? (wallet?.totalEarned || 0) / jobsCompleted : 0,
            availableBalance: wallet?.availableBalance || 0,
            pendingBalance: wallet?.pendingBalance || 0,
            nextPayout: "Friday • 6:00 PM",
            chartData,
            transactions,
        };
    }

    private async getChartData(providerId: Types.ObjectId) {
        const sevenDaysAgo = dayjs().subtract(6, 'days').startOf('day').toDate();

        // Use Transaction model instead of Booking for the chart
        const stats = await Transaction.aggregate([
            {
                $match: {
                    providerId,
                    status: { $in: ['pending', 'completed'] }, // Include pending so the chart fills up immediately
                    purpose: 'booking_revenue',
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    dailyNet: { $sum: "$amount" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const dateStr = dayjs().subtract(6 - i, 'days').format('YYYY-MM-DD');
            const dayData = stats.find(s => s._id === dateStr);
            return dayData ? dayData.dailyNet : 0;
        });

        return last7Days;
    }
}

export const EarningsService = new EarningsServiceClass();