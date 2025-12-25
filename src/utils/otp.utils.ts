import fs from 'fs/promises'; // Correct fs import
import Handlebars from 'handlebars';
import path from 'path';
import crypto from "crypto";

interface OtpEmailData {
    otpCode: string;
}


export function generateNumericOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

export function hashOtp(otp: string): string {
    return crypto.createHash("sha256").update(otp).digest("hex");
}


export async function getOtpEmailContent({ otpCode }: OtpEmailData): Promise<string> {
    try {
        const templatePath = path.resolve(__dirname, '..', 'templates', 'otpCode_templates.hbs');

        const templateSource = await fs.readFile(templatePath, 'utf-8');

        const template = Handlebars.compile(templateSource);

        return template({ year: new Date().getFullYear(), otpCode });
    } catch (error) {
        console.error("Error reading or compiling template:", error);
        throw error;
    }
}
