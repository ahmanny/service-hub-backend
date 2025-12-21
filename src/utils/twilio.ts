import Twilio from "twilio";
import Exception from "../exceptions/Exception";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const client = require('twilio')(accountSid, authToken);

export const sendOtpSms = async (to: string, message: string) => {
    try {
        console.log(to);

        const response = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER!,
            to: '+2349124977713'
        });
        console.log("Twilio response:", response.sid);
        return response.sid;
    } catch (error) {
        console.error("Failed to send OTP:", error);
        throw new Exception("Could not send OTP via SMS");
    }
};


export const sendOtpWhatsapp = async (to: string, otp: string) => {

    const from = "whatsapp:+14155238886"
    const towho = `whatsapp:+${to}`
    try {
        const response = await client.messages.create({
            from: `${from}`,
            contentSid: 'HX229f5a04fd0510ce1b071852155d3e75',
            contentVariables: `{"1":${otp}}`,
            to: `${towho}`
        });
        console.log("Twilio response:", response.sid);
        return response.sid;
    } catch (error) {
        console.error("Failed to send OTP:", error);
        throw new Error("Could not send OTP via whatsapp");
    }
};
