import { startOfMonth, endOfMonth, eachDayOfInterval, format, endOfToday, startOfTomorrow } from 'date-fns';
import { User } from "../models/user.model";

class AdminServiceClass {
    constructor() {
        // super()
    }
    // get daily customers
    public async getDailyCustomersFunction() {
        const now = new Date();
        const start = startOfMonth(now);
        const end = startOfTomorrow();


        return;
    }
}

export const AdminService = new AdminServiceClass();
