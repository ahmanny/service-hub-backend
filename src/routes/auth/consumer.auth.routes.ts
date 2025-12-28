import { Router } from "express";
import * as controller from '../../controllers/auth.controller';
import * as consumerController from '../../controllers/consumer/consumer.controller';



export const consumerAuthRoutes = Router()

consumerAuthRoutes.post('/send-otp', controller.sendOtp())
consumerAuthRoutes.post('/resend-otp', controller.resendOtp())
consumerAuthRoutes.post('/get-otp-cooldown', controller.getOtpCooldown())
consumerAuthRoutes.post('/refresh', controller.refreshSession())
consumerAuthRoutes.post('/logout', controller.logout())


consumerAuthRoutes.post('/verify-otp', consumerController.verifyOtp())