import Exception from "../exceptions/Exception";
import { OtpSession } from "../models/otp.model";
import { generateNumericOtp, hashOtp } from "../utils/otp.utils";
import { sendOtpSms } from "../utils/twilio";
import { BLOCK_DURATION_HOURS, MAX_COOLDOWN_SECONDS, MAX_SEND_PER_HOUR, MAX_VERIFY_ATTEMPTS, OTP_EXPIRY_MINUTES, RESEND_COOLDOWN_BASE } from "../configs/otpPolicy";
import TooManyAttemptsException from "../exceptions/TooManyAttemptsException";
import { generateTokens } from "../utils";
import { createUser, getUserByPhone } from "../models/user.model";



class AuthServiceClass {
    constructor() {
        // super()
    }

    // send user otp via email for email verification 
    public async sendOtpFunction(payload: { phone: string }) {
        const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
        if (!payload.phone) {
            throw new Exception("Phone number is required");
        }

        const now = new Date();
        let session = await OtpSession.findOne({ phone: payload.phone });

        // BLOCK CHECK
        if (session?.blockedUntil && session.blockedUntil > now) {
            throw new TooManyAttemptsException("Too many attempts. Try again later.");
        }

        if (!session) {
            // First OTP ever for this number
            session = new OtpSession({
                phone: payload.phone,
                sendCount: 1,
                firstSentAt: now,
                lastSentAt: now,
                verifyAttempts: 0,
                blockedUntil: null,
            });
        } else {
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            // RESET rolling window if first send > 1 hour ago
            if (!session.firstSentAt || session.firstSentAt < oneHourAgo) {
                session.sendCount = 1;
                session.firstSentAt = now;
            } else {
                // Progressive cooldown logic
                const cooldownSeconds = Math.min(RESEND_COOLDOWN_BASE * session.sendCount, MAX_COOLDOWN_SECONDS);
                const diffSeconds = (now.getTime() - session.lastSentAt.getTime()) / 1000;

                if (diffSeconds < cooldownSeconds) {
                    const waitTime = Math.ceil(cooldownSeconds - diffSeconds);
                    throw new TooManyAttemptsException(`Please wait ${formatTime(waitTime)} seconds before requesting another code`);
                }
                // Check max sends
                if (session.sendCount >= MAX_SEND_PER_HOUR) {
                    session.blockedUntil = new Date(now.getTime() + BLOCK_DURATION_HOURS * 60 * 60 * 1000);
                    await session.save();
                    throw new TooManyAttemptsException("Too many attempts. Try again later.");
                }

                session.sendCount += 1;
            }

            session.lastSentAt = now;
        }

        // GENERATE OTP
        const otp = generateNumericOtp();
        session.otpHash = hashOtp(otp);
        session.expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
        session.verifyAttempts = 0;  // reset verify attempts

        // SEND OTP
        const message = `Your ServiceHub OTP is: ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`;
        console.log(message)
        // await sendOtpSms(payload.phone, message);

        await session.save();

        const cooldown = Math.min(RESEND_COOLDOWN_BASE * session.sendCount, MAX_COOLDOWN_SECONDS);
        return { message: "OTP sent successfully", cooldown };
    }
    // resend otp function
    public async resendOtp(payload: { phone: string }) {
        if (!payload.phone) throw new Exception("Phone number is required");
        const phone = payload.phone
        const now = new Date();
        const session = await OtpSession.findOne({ phone });
        if (!session) throw new Exception("No OTP session found, please request a new code");

        if (session.blockedUntil && session.blockedUntil > now) {
            throw new TooManyAttemptsException("Too many attempts. Try again later.");
        }

        const cooldownSeconds = Math.min(RESEND_COOLDOWN_BASE * session.sendCount, MAX_COOLDOWN_SECONDS);
        const diffSeconds = (now.getTime() - session.lastSentAt.getTime()) / 1000;
        if (diffSeconds < cooldownSeconds) {
            const waitTime = Math.ceil(cooldownSeconds - diffSeconds);
            throw new TooManyAttemptsException(`Please wait ${waitTime} seconds before requesting another code`);
        }

        if (session.sendCount >= MAX_SEND_PER_HOUR) {
            session.blockedUntil = new Date(now.getTime() + BLOCK_DURATION_HOURS * 60 * 60 * 1000);
            await session.save();
            throw new TooManyAttemptsException("Too many attempts. Try again later.");
        }

        session.sendCount += 1;
        session.lastSentAt = now;
        session.verifyAttempts = 0;

        const otp = generateNumericOtp();
        session.otpHash = hashOtp(otp);
        session.expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

        await session.save();

        const message = `Your ServiceHub OTP is: ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`
        console.log(message)

        // await sendOtpSms(phone, message);
        const cooldown = Math.min(RESEND_COOLDOWN_BASE * session.sendCount, MAX_COOLDOWN_SECONDS);

        return { message: "OTP resent successfully", cooldown };
    }
    // verify otp function
    public async verifyOtp(payload: { phone: string, otp: string }) {
        const phone = payload.phone
        const otp = payload.otp
        if (!phone || !otp) throw new Exception("Phone and OTP are required");

        const now = new Date();
        const session = await OtpSession.findOne({ phone });
        if (!session) throw new Exception("No OTP session found, please request a code");

        if (session.blockedUntil && session.blockedUntil > now) {
            throw new TooManyAttemptsException("Too many attempts. Try again later.");
        }

        if (session.expiresAt < now) throw new Exception("OTP expired. Please request a new code.");

        if (session.verifyAttempts >= MAX_VERIFY_ATTEMPTS) {
            session.blockedUntil = new Date(now.getTime() + BLOCK_DURATION_HOURS * 60 * 60 * 1000);
            await session.save();
            throw new TooManyAttemptsException("Too many failed attempts. Try again later.");
        }

        if (hashOtp(otp) !== session.otpHash) {
            session.verifyAttempts += 1;
            await session.save();
            throw new Exception("Invalid OTP. Please try again.");
        }

        // OTP verified find or create consumer
        let user = await getUserByPhone(phone);

        if (!user) {
            user = await createUser({
                phone,
                isEmailVerified: false
            })
        }

        const tokens = await generateTokens(user);
        // success ....delete session
        await session.deleteOne();

        return {
            tokens,
            user
        };
    }

    // fetch remaing cooldown
    public async getCooldown(payload: { phone: string }) {
        const phone = payload.phone
        const session = await OtpSession.findOne({ phone });
        if (!session) return { cooldown: 0 };
        const now = new Date();
        const cooldownSeconds = Math.min(RESEND_COOLDOWN_BASE * session.sendCount, MAX_COOLDOWN_SECONDS);
        const diffSeconds = (now.getTime() - session.lastSentAt.getTime()) / 1000;
        return { cooldown: Math.max(0, Math.ceil(cooldownSeconds - diffSeconds)) };
    }
}



export const AuthService = new AuthServiceClass();
