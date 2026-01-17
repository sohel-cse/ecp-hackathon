import nodemailer from 'nodemailer';
import { IEmailService } from '@user-mgmt/shared';

export class NodemailerEmailService implements IEmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        // For demonstration purposes, we'll use a mock/trap configuration or 
        // read from environment variables. In a real app, this should be configurable.
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '1025'), // Mailhog/Mailtrap default
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            } : undefined
        });
    }

    async sendHtmlEmail(to: string, subject: string, html: string): Promise<void> {
        try {
            await this.transporter.sendMail({
                from: process.env.EMAIL_FROM || '"User Management" <noreply@example.com>',
                to,
                subject,
                html
            });
            console.log(`Email sent to ${to}: ${subject}`);
        } catch (error) {
            console.error(`Failed to send email to ${to}:`, error);
            // We might not want to throw here if we don't want to fail registration 
            // just because of an email error, but it depends on the requirements.
            // For now, let's throw to ensure we know it failed.
            throw new Error('Could not send welcome email');
        }
    }
}
