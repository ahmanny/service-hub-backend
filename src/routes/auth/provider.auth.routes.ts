import { Router } from "express";
import * as controller from '../../controllers/auth.controller';


export const providerAuthRoutes = Router()

providerAuthRoutes.post('/send-otp', controller.sendOtp())
providerAuthRoutes.post('/resend-otp', controller.resendOtp())
providerAuthRoutes.post('/get-otp-cooldown', controller.getOtpCooldown())
providerAuthRoutes.post('/refresh', controller.refreshSession())
providerAuthRoutes.post('/logout', controller.logout())


providerAuthRoutes.post('/verify-otp', controller.verifyOtp("provider"))