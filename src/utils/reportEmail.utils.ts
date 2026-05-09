import fs from 'fs/promises';
import Handlebars from 'handlebars';
import path from 'path';

interface ReportEmailData {
    category: string;
    description: string;
    email?: string;
    bookingId?: string;
}

export async function getReportEmailContent(data: ReportEmailData): Promise<string> {
    try {
        const templatePath = path.resolve(__dirname, '..', 'templates', 'reportEmail.template.hbs');
        const templateSource = await fs.readFile(templatePath, 'utf-8');
        const template = Handlebars.compile(templateSource);

        return template({
            ...data,
            year: new Date().getFullYear(),
            timestamp: new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }),
            logoUrl: `${process.env.APP_URL || 'https://proxxi.app'}/logo.png`,
        });
    } catch (error) {
        console.error("Error reading or compiling report email template:", error);
        throw error;
    }
}