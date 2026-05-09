import { Router } from 'express';
import * as controller from '../controllers/marketing.controller';

export const marketingRoutes = Router();

marketingRoutes.post('/contact', controller.submitContact());
marketingRoutes.post('/report', controller.submitReport());