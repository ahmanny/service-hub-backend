import Exception from "../exceptions/Exception";
import { OtpSession } from "../models/otp.model";
import { generateNumericOtp, hashOtp } from "../utils/otp.utils";
import { sendOtpSms } from "../utils/twilio";
import { BLOCK_DURATION_HOURS, MAX_COOLDOWN_SECONDS, MAX_SEND_PER_HOUR, MAX_VERIFY_ATTEMPTS, OTP_EXPIRY_MINUTES, RESEND_COOLDOWN_BASE } from "../configs/otpPolicy";
import TooManyAttemptsException from "../exceptions/TooManyAttemptsException";
import { AppRole, generateTokens, getUserTokenInfo } from "../utils";
import { getUserById, User } from "../models/user.model";
import InvalidAccessCredentialsExceptions from "../exceptions/InvalidAccessCredentialsException";
import { RefreshToken } from "../models/refresh-token.model";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import MissingParameterException from "../exceptions/MissingParameterException";
import { ConsumerService } from "./consumer.service";



class AuthServiceClass {
    constructor() {
        // super()
    }

    /**
    * Sends OTP to a phone number.
    */
    public async sendOtpFunction(payload: { phone: string }) {
        const { phone } = payload;
        if (!phone) throw new MissingParameterException("Phone number is required");

        const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

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
        const message = `Your Code: ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`;
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
    public async verifyOtp(payload: { phone: string, otp: string, appType: AppRole }) {
        const { phone, otp, appType } = payload;
        if (!phone || !otp || !appType) throw new Exception("Phone, OTP, and App Type are required");

        const now = new Date();
        const session = await OtpSession.findOne({ phone });
        if (!session) throw new Exception("No OTP session found, please request a code");

        if (session.blockedUntil && session.blockedUntil > now) {
            throw new TooManyAttemptsException("Too many attempts. Try again later.");
        }

        if (session.expiresAt < now) throw new Exception("OTP expired.");

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

        // --- IDENTITY LOGIC START ---
        const phoneField = appType === 'consumer' ? 'consumerPhone' : 'providerPhone';

        //  Check if user exists with THIS specific role's phone
        let user = await User.findOne({ [phoneField]: phone });


        if (!user) {
            //  Check if they exist under the OTHER role's phone (to link them)
            const otherField = appType === 'consumer' ? 'providerPhone' : 'consumerPhone';
            user = await User.findOne({ [otherField]: phone });

            if (user) {
                // Link existing user to this new role
                user[phoneField] = phone;
                if (!user.activeRoles.includes(appType)) user.activeRoles.push(appType);
                await user.save();
            } else {
                //  Brand new user for the whole system
                user = await User.create({
                    [phoneField]: phone,
                    activeRoles: [appType]
                });
            }
        }

        const tokens = await generateTokens(user, appType);
        // success ....delete session
        await session.deleteOne();

        // Fetch the profile for this specific app
        let profileData;
        if (appType === 'consumer') {
            profileData = await ConsumerService.fetchProfile(user._id);
        } else {
            // profileData = await ProviderService.fetchProfile(user._id);
        }

        return {
            tokens,
            user,
            ...profileData // This spreads { hasProfile, profile }
        };
    }

    // fetch 
    // ]remaing cooldown
    public async getCooldown(payload: { phone: string }) {
        const phone = payload.phone
        const session = await OtpSession.findOne({ phone });
        if (!session) return { cooldown: 0 };
        const now = new Date();
        const cooldownSeconds = Math.min(RESEND_COOLDOWN_BASE * session.sendCount, MAX_COOLDOWN_SECONDS);
        const diffSeconds = (now.getTime() - session.lastSentAt.getTime()) / 1000;
        return { cooldown: Math.max(0, Math.ceil(cooldownSeconds - diffSeconds)) };
    }
    // refresh user's session
    public async refreshUserSession(refresh_token: string) {
        const token = await getUserTokenInfo({
            token: refresh_token,
            token_type: "refresh"
        });
        if (!token) {
            throw new InvalidAccessCredentialsExceptions("Session token is invallid")
        }
        const { appType, user } = token

        if (!user || !appType) {
            throw new InvalidAccessCredentialsExceptions("Session token is invallid")
        }
        const tokenInDb = await RefreshToken.findOne({ refresh_token: refresh_token, user_id: user?._id, appType });
        if (!tokenInDb) {
            throw new ResourceNotFoundException("in valid session token try login in again")
        }
        const userDb = await getUserById(user?._id)
        if (!userDb) {
            throw new ResourceNotFoundException("User not found")
        }
        await RefreshToken.deleteOne({ refresh_token })

        const tokens = await generateTokens(user, appType)

        return {
            tokens
        }

    }
    // log out
    public async logout(refresh_token: string) {
        const tokenInDb = await RefreshToken.findOne({ refresh_token })
        if (!tokenInDb) {
            throw new InvalidAccessCredentialsExceptions("You are not logged in any session.")
        }
        // delete the token from the db
        await RefreshToken.deleteOne({ refresh_token })
    }
}



export const AuthService = new AuthServiceClass();
