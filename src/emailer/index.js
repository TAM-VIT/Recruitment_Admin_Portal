/**
 * Recruitment Portal - Emailer Module
 * Public interface for sending recruitment status emails.
 *
 * Usage in Backend:
 * ```javascript
 * const { sendShortlistEmail, sendFinalShortlistEmail } = require('./emailer');
 * // or in TypeScript / ESM:
 * import { sendShortlistEmail, sendFinalShortlistEmail } from './emailer';
 *
 * // Initial Application Shortlisting
 * await sendShortlistEmail({
 *   name: 'Jhon Doe',
 *   email: 'jhon.doe2023@example.com',
 *   shortlisted: true // sends interview shortlist email
 * });
 *
 * // Final Interview Outcome (Selection / Rejection)
 * await sendFinalShortlistEmail({
 *   name: 'Rahul Sharma',
 *   email: 'rahul@vitstudent.ac.in',
 *   isShortlisted: true, // sends final selection confirmation email
 *   groupLink: 'https://chat.whatsapp.com/example'
 * });
 *
 * await sendFinalShortlistEmail({
 *   name: 'Rahul Sharma',
 *   email: 'rahul@vitstudent.ac.in',
 *   isShortlisted: false // sends final rejection notification email
 * });
 * ```
 */

const { sendShortlistEmail, prepareEmail } = require("./emailService");
const {
    sendFinalShortlistEmail,
    prepareFinalShortlistEmail
} = require("./FinalShortlistEmailer");
const {
    validateApplicant,
    isValidApplicant,
    validateFinalShortlistDetails,
    isValidFinalShortlistDetails
} = require("./validation");
const {
    sendEmail,
    transporter,
    setTransporter,
    getTransporter,
    resetTransporter
} = require("./mailer");

module.exports = {
    // Primary API for initial application shortlisting
    sendShortlistEmail,

    // Primary API for final interview outcome notifications
    sendFinalShortlistEmail,

    // Template inspection / dry-run helpers
    prepareEmail,
    prepareFinalShortlistEmail,

    // Validation utilities
    validateApplicant,
    isValidApplicant,
    validateFinalShortlistDetails,
    isValidFinalShortlistDetails,

    // Low-level mailer & transporter helpers
    sendEmail,
    transporter,
    setTransporter,
    getTransporter,
    resetTransporter
};
