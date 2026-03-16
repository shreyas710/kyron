import twilio from "twilio";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    EMAIL_FROM
} = process.env;

const twilioClient = TWILIO_ACCOUNT_SID ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

const mailTransporter = (SMTP_HOST && SMTP_USER) ? nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
}) : null;

export async function sendNotifications({ intake, providerName, slot }) {
    if (!intake || !providerName || !slot) {
        throw new Error("intake, providerName, and slot are required to send notifications.");
    }

    const message = `Kyron Medical: Your appointment with ${providerName} is confirmed for ${slot}.`;

    // SMS Notification
    if (intake.smsOptIn && intake.phone && twilioClient) {
        try {
            await twilioClient.messages.create({
                body: message,
                from: TWILIO_PHONE_NUMBER,
                to: intake.phone,
            });
            console.log(`✅ SMS notification sent to ${intake.phone}`);
        } catch (error) {
            console.error("❌ Twilio SMS Error:", error.message);
        }
    } else {
        console.log(`ℹ️ Skipping SMS notification for ${intake.phone || "unknown phone number"}. Opt-in: ${intake.smsOptIn}, Twilio Configured: ${!!twilioClient}`);
    }

    // Email Notification
    if (intake.email && mailTransporter) {
        try {
            const info = await mailTransporter.sendMail({
                from: EMAIL_FROM || '"Kyron Medical" <noreply@kyronmedical.com>',
                to: intake.email,
                subject: "Appointment Confirmation - Kyron Medical",
                text: `Hello ${intake.firstName},\n\n${message}\n\nThank you for choosing Kyron Medical.`,
                html: `<p>Hello ${intake.firstName},</p><p>${message}</p><p>Thank you for choosing Kyron Medical.</p>`,
            });
            console.log(`✅ Email notification sent to ${intake.email} (Message ID: ${info.messageId})`);
        } catch (error) {
            console.error("❌ Email Error:", error.message);
        }
    } else if (intake.email) {
        console.log("\n" + "=".repeat(50));
        console.log(`📧 MOCK EMAIL SENT TO: ${intake.email}`);
        console.log(`Subject: Appointment Confirmation\nBody:\nHello ${intake.firstName},\n\n${message}\n\nThank you for choosing Kyron Medical.`);
        console.log("=".repeat(50) + "\n");
    }
}