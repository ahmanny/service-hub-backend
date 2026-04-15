import { Router } from "express";
import * as paymentController from "../controllers/payment.controller";

export const webhookRoutes = Router();

// Dedicated path for third-party service callbacks
webhookRoutes.post("/paystack", paymentController.paystackWebhook());