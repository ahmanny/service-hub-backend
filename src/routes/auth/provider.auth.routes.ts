import { Router } from "express";
import * as controller from '../../controllers/auth.controller';



export const providerAuthRoutes = Router()

providerAuthRoutes.post('/send-otp', controller.sendOtp())
providerAuthRoutes.post('/verify-otp', controller.verifyOtp())
providerAuthRoutes.post('/resend-otp', controller.resendOtp())
providerAuthRoutes.post('/get-otp-cooldown', controller.getOtpCooldown())