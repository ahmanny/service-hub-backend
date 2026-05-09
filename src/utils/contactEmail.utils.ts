import fs from 'fs/promises';
import Handlebars from 'handlebars';
import path from 'path';

interface ContactEmailData {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
}

export async function getContactEmailContent(data: ContactEmailData): Promise<string> {
    try {
        const templatePath = path.resolve(__dirname, '..', 'templates', 'contactEmail.template.hbs');
        const templateSource = await fs.readFile(templatePath, 'utf-8');
        const template = Handlebars.compile(templateSource);

        return template({
            ...data,
            message: data.message.replace(/\n/g, '\n'),
            year: new Date().getFullYear(),
            timestamp: new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }),
            logoUrl: `${process.env.APP_URL || 'https://proxxi.app'}/logo.png`,
        });
    } catch (error) {
        console.error("Error reading or compiling contact email template:", error);
        throw error;
    }
}