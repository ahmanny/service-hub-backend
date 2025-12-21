import { Router } from "express";
import * as controller from '../../controllers/auth/consumer.auth.controller';



export const consumerAuthRoutes = Router()

consumerAuthRoutes.post('/send-otp', controller.sendOtp())
consumerAuthRoutes.post('/verify-otp', controller.verifyOtp())
consumerAuthRoutes.post('/resend-otp', controller.resendOtp())
consumerAuthRoutes.post('/get-otp-cooldown', controller.getOtpCooldown())