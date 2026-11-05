const path = require("path");
// Load environment variables from cwd or root .env
require("dotenv").config();
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const nodemailer = require("nodemailer");

/**
 * Creates the standard nodemailer transporter configured for Gmail.
 * Reads credentials securely from environment variables.
 */
function createDefaultTransporter() {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        }
    });
}

let activeTransporter = createDefaultTransporter();

/**
 * Replaces the active transporter (useful for unit and integration testing
 * to ensure no real emails are ever dispatched).
 */
function setTransporter(transporter) {
    activeTransporter = transporter;
}

/**
 * Returns the currently active transporter.
 */
function getTransporter() {
    return activeTransporter;
}

/**
 * Resets the transporter back to the default nodemailer transport.
 */
function resetTransporter() {
    activeTransporter = createDefaultTransporter();
}

/**
 * Sends an email using the active or provided transporter.
 *
 * @param {Object} email
 * @param {string} email.to - Recipient email address
 * @param {string} email.subject - Subject line
 * @param {string} [email.message] - Plain text content
 * @param {string} [email.text] - Alternative key for plain text content
 * @param {string} [email.html] - Optional rich HTML formatted body
 * @param {Object} [customTransporter] - Optional custom transporter (for testing/mocking)
 */
async function sendEmail(email, customTransporter = null) {
    const transporterToUse = customTransporter || activeTransporter;
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const replyToAddress = process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER;

    const mailOptions = {
        from: fromAddress,
        to: email.to,
        replyTo: email.replyTo || replyToAddress,
        subject: email.subject,
        text: email.message || email.text,
        headers: {
            "X-Priority": "3",
            "Importance": "Normal"
        }
    };

    if (email.html) {
        mailOptions.html = email.html;
    }

    if (email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0) {
        mailOptions.attachments = email.attachments;
    }

    return transporterToUse.sendMail(mailOptions);
}

module.exports = {
    sendEmail,
    get transporter() {
        return activeTransporter;
    },
    setTransporter,
    getTransporter,
    resetTransporter
};
