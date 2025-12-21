
export interface ConsumerSignupPayloadInterface {
    firstName: string;
    lastName: string;
    phone: string;
    email: string
    password: string
}
export interface ConsumerLoginPayloadInterface {
    email: string
    password: string
}
export interface ConsumerOtpverifyPayloadInterface {
    email: string
    otpcode: string
}
export interface forgotPasswordPayloadInterface {
    email: string
}
export interface passwordResetPayloadInterface {
    token: string
    password: string
}
