import fs from 'fs/promises'; // Correct fs import
import Handlebars from 'handlebars';
import path from 'path';


interface resetPasswordEmailData {
    token: string,
    email: string,
    firstName: string,
    lastName: string,
}


export async function getVerificationEmailContent({ token, email, firstName, lastName }: resetPasswordEmailData): Promise<string> {
    try {
        const clientResetPasswordUrl = process.env.CLIENT_RESET_PASSWORD_URL || 'http://localhost:3000/auth/reset-password'
        const templatePath = path.resolve(__dirname, '..', 'templates', 'resetPasswordEmail.template.hbs');

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

