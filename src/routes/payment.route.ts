import { Router } from "express";
import { AuthMiddleware } from "../middlewares";
import * as controller from "../controllers/payment.controller";

export const paymentRoutes = Router();
const auth = new AuthMiddleware();