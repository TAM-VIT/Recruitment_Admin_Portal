/**
 * Recruitment Portal - Emailer Module
 * Public interface for sending recruitment status emails.
 *
 * Usage in Backend:
 * ```javascript
 * const { sendShortlistEmail } = require('./emailer');
 * // or in TypeScript / ESM:
 * import { sendShortlistEmail } from './emailer';
 *
 * await sendShortlistEmail({
 *   name: 'Jhon Doe',
 *   email: 'jhon.doe2023@example.com',
 *   shortlisted: true // sends interview shortlist email
 * });
 *
 * await sendShortlistEmail({
 *   name: 'Jane Doe',
 *   email: 'jhon.doe2023@example.com',
 *   shortlisted: false // sends polite rejection email
 * });
 * ```
 */

const { sendShortlistEmail, prepareEmail } = require("./emailService");
const { validateApplicant, isValidApplicant } = require("./validation");
const {
    sendEmail,
    transporter,
    setTransporter,
    getTransporter,
    resetTransporter
} = require("./mailer");

module.exports = {
    // Primary API for backend developers
    sendShortlistEmail,

    // Template inspection / dry-run helper
    prepareEmail,

    // Validation utilities
    validateApplicant,
    isValidApplicant,

    // Low-level mailer & transporter helpers
    sendEmail,
    transporter,
    setTransporter,
    getTransporter,
    resetTransporter
};
