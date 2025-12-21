import { Router } from 'express';
import * as controller from '../controllers';

export const adminRoutes = Router();
adminRoutes.get('/dashboard-stats', controller.getAdminDashboardStats());