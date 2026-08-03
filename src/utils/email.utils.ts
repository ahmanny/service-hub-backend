import fs from 'fs/promises';
import fsSync from 'fs';
import Handlebars from 'handlebars';
import path from 'path';

function getTemplatePath(templateFileName: string): string {
    const distPath = path.resolve(__dirname, '..', 'templates', templateFileName);
    if (fsSync.existsSync(distPath)) {
        return distPath;
    }
    const srcPath = path.resolve(process.cwd(), 'src', 'templates', templateFileName);
    if (fsSync.existsSync(srcPath)) {
        return srcPath;
    }
    return distPath;
}

interface resetPasswordEmailData {
    token: string,
    email: string,
    firstName: string,
    lastName: string,
}

export async function getVerificationEmailContent({ token, email, firstName, lastName }: resetPasswordEmailData): Promise<string> {
    try {
        const clientResetPasswordUrl = process.env.CLIENT_RESET_PASSWORD_URL || 'http://localhost:3000/auth/reset-password'
        const templatePath = getTemplatePath('resetPasswordEmail.template.hbs');

        const templateSource = await fs.readFile(templatePath, 'utf-8');

        const template = Handlebars.compile(templateSource);

        return template({
            token, email, firstName: encodeURIComponent(firstName),
            lastName: encodeURIComponent(lastName), clientResetPasswordUrl,
            encodeEmail: encodeURIComponent(email)
        });
    } catch (error) {
        console.error("Error reading or compiling template:", error);
        throw error;
    }
}

export async function getEmailVerificationContent(data: { otpCode: string; verificationUrl: string }): Promise<string> {
    try {
        const templatePath = getTemplatePath('emailVerification.template.hbs');
        const templateSource = await fs.readFile(templatePath, 'utf-8');
        const template = Handlebars.compile(templateSource);

        return template({
            ...data,
            year: new Date().getFullYear(),
        });
    } catch (error) {
        console.error("Error reading or compiling email verification template:", error);
        throw error;
    }
}

