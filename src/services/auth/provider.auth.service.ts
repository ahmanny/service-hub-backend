import bcrypt from 'bcryptjs'
import jwt, { JwtPayload } from 'jsonwebtoken';
import { generateTokens, getConsumerTokenInfo, sanitizeUser } from "../../utils";
import axios from "axios";
import { ConsumerLoginPayloadInterface, ConsumerSignupPayloadInterface, forgotPasswordPayloadInterface, passwordResetPayloadInterface } from "../../types/consumer";
import { Consumer, getConsumerByEmail } from "../../models/consumer.model";
import InvalidAccessCredentialsExceptions from '../../exceptions/InvalidAccessCredentialsException';
import ConflictException from '../../exceptions/ConflictException';
import ResourceNotFoundException from '../../exceptions/ResourceNotFoundException';
import { RefreshToken } from '../../models/refresh-token.model';
import { EmailService } from '../email.service';


class ProviderAuthServiceClass {
    constructor() {
        // super()
    }

    // registration of new consumer
    public async signUpFunction(payload: ConsumerSignupPayloadInterface) {
        if (!payload.firstName || !payload.lastName || !payload.email || !payload.password) {
            throw new InvalidAccessCredentialsExceptions("Please Provide your credentials")
        }
        const user_email = await getConsumerByEmail(payload.email)

        // check if a user with the name and email exists
        if (user_email) {
            throw new ConflictException('Email already exists');
        }

        // encript password before storing in the db
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(payload.password, salt);
        const user = await Consumer.create({ ...payload, password: hashedPassword });

        const tokens = await generateTokens(user);
        return {
            user: sanitizeUser(user),
            tokens
        }
    }

    // login service for Consumer
    public async loginFunction(payload: ConsumerLoginPayloadInterface) {
        if (!payload.email || !payload.password) {
            throw new InvalidAccessCredentialsExceptions("Invalid Credentials")
        }
        const user = await getConsumerByEmail(payload.email).lean()

        // check if the user exists
        if (!user) {
            throw new ResourceNotFoundException("User by this email does not exists")
        }

        // if (!user.password) {
        //     throw new InvalidAccessCredentialsExceptions(
        //         `User registered with ${user.provider}, please login with your provider`
        //     );
        // }
        const validPassword = await bcrypt.compare(payload.password, user.phone);
        // check if user entered a correct password
        if (!validPassword) {
            throw new InvalidAccessCredentialsExceptions("Wrong password")
        }
        const tokens = await generateTokens(user);
        return {
            user: sanitizeUser(user),
            tokens
        }
    }

    // login service for user
    public async googleLoginFunction(payload: { access_token: string }) {
        if (!payload.access_token) {
            throw new InvalidAccessCredentialsExceptions("Missing Google access token")
        }

        // Fetch Google profile
        const googleRes = await axios.get(
            `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${payload.access_token}`
        );

        const { email, name, picture } = googleRes.data
        const [firstName, ...rest] = name.split(" ");
        const lastName = rest.join(" ") || "";

        let user = await getConsumerByEmail(email).lean()

        // check if the user exists
        if (!user) {
            // Create a new user if not exists
            user = await Consumer.create({
                firstName,
                lastName,
                email,
                password: null, // OAuth users don't have local password
                isVerified: true,
                avatarUrl: picture,
                provider: "google",
            });
        }
        const tokens = await generateTokens(user);
        return {
            user: sanitizeUser(user),
            tokens
        }
    }

    // logout service for user
    public async logoutFunction(refresh_token: string) {
        // check if the token is in the db
        const tokenInDb = await RefreshToken.findOne({ refresh_token });
        if (!tokenInDb) {
            throw new InvalidAccessCredentialsExceptions("Invalid refresh token")
        }
        // delete the token from the db
        await RefreshToken.deleteOne({ refresh_token });
    }


    // refresh users session using refreshtoken
    public async refreshUserToken(refresh_token: string) {

        const token_info = await getConsumerTokenInfo({
            token: refresh_token,
            token_type: 'refresh',
        });


        if (!token_info?.is_valid_token || !token_info?.user) {
            throw new InvalidAccessCredentialsExceptions("Invalid or expired refresh token")
        }

        // Check if token is in DB
        const tokenInDb = await RefreshToken.findOne({ refresh_token: refresh_token, user_id: token_info?.user._id });
        if (!tokenInDb) {
            throw new ResourceNotFoundException("Refresh token not found in DB")
        }
        const user = await getConsumerByEmail(token_info?.user?.email!)
        if (!user) {
            throw new ResourceNotFoundException("User not found")
        }

        //3. delete old token and save new one
        await RefreshToken.deleteOne({ token: refresh_token });

        const tokens = await generateTokens(user);
        return {
            tokens, user: sanitizeUser(user)
        }
    }
    // forgotten password service

    public async forgottenPasswordFunction(payload: forgotPasswordPayloadInterface) {
        const user = await getConsumerByEmail(payload.email)


        // check if a user with the email exist
        if (!user) {
            throw new InvalidAccessCredentialsExceptions("Account does not exist")
        }
        // const data = await EmailService.sendUserResetPasswordEmail({
        //     id: user._id,
        //     email: user.email,
        //     firstName: user.firstName,
        //     lastName: user.lastName
        // })
        return {
            data: "sent"
        }
    }


    // reset password
    public async passwordResetFunction(payload: passwordResetPayloadInterface) {
        const secret = process.env.JWT_SECRET as string
        const decoded = jwt.verify(payload.token, secret) as JwtPayload

        const user = await Consumer.findById(decoded.id)
        // check if a user with the email exist
        if (!user) {
            throw new InvalidAccessCredentialsExceptions("invalid credential")
        }
        // // check if user is verified
        // if (!user.isVerified) {
        //     throw new Exception('User not registered')
        // }

        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(payload.password, salt);
        // user.password = hashedPassword;
        user.save()
    }




    public async create_Superadmin() {
        const admin = {
            name: "Alice",
            phone: '00000000001',
            email: "arab@mailinator.com",
            password: "1234567890",
            isVerified: true,
            location: {
                type: "Point",
                coordinates: [3.3792, 6.5244] // lng, lat
            }
        }
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(admin.password, salt);
        const new_admin = await Consumer.create({ ...admin, password: hashedPassword });
        console.log('created a admin');
        console.log(new_admin);


    }


    // public async verifyOtpFunction(payload: OtpverifyPayloadInterface) {
    //     authenticator.options = {
    //         window: 20,
    //         digits: 6,
    //     };

    //     const user = await getUserByEmail(payload.email);
    //     if (!user) {
    //         throw new Exception("Invalid email");
    //     }

    //     const userId = user._id;
    //     const otpRecord = await getUserOtpById(userId).exec();

    //     if (!otpRecord) {
    //         throw new Exception("You were not sent an OTP");
    //     }

    //     const isExpired = Date.now() > otpRecord.otpExpiration.getTime();
    //     if (isExpired) {
    //         await deleteUserOtpById(userId);
    //         throw new Exception("OTP has expired");
    //     }

    //     const isValid = authenticator.verify({ token: payload.otpcode, secret: otpRecord.secret });

    //     if (!isValid) {
    //         throw new InvalidAccessCredentialsExceptions("Incorrect code");
    //     }
    //     await deleteUserOtpById(userId);

    //     const tokens = await generateTokens(user);
    //     return {
    //         user, tokens
    //     }
    // }
}
export const ProviderAuthService = new ProviderAuthServiceClass();



