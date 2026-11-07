/**
 * Type declarations for the emailer module.
 */

export interface ApplicantNotificationPayload {
    name: string;
    email: string;
    shortlisted: boolean;
    status?: string;
    /** Student site address; adds a link to the shortlist email */
    portalUrl?: string;
}

export interface FinalShortlistPayload {
    name: string;
    email: string;
    isShortlisted: boolean;
    groupLink?: string;
}

export interface EmailData {
    to: string;
    subject: string;
    message: string;
    html: string;
    shortlisted: boolean;
    isShortlisted?: boolean;
    groupLink?: string;
    attachments?: any[];
}

export interface SendShortlistEmailResult {
    success: boolean;
    recipient: string;
    shortlisted: boolean;
    messageId: string;
}

export interface SendFinalShortlistEmailResult {
    success: boolean;
    recipient: string;
    isShortlisted: boolean;
    shortlisted?: boolean;
    messageId: string;
}

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export interface EmailOptions {
    to: string;
    subject: string;
    message?: string;
    text?: string;
    html?: string;
    attachments?: any[];
}

/**
 * Validates, prepares, and sends an initial stage email notification to a candidate.
 * If shortlisted is true, sends an interview invitation with slot booking instructions.
 * If shortlisted is false, sends a polite rejection email.
 *
 * @throws Error if input fails validation or SMTP delivery fails
 */
export function sendShortlistEmail(
    applicant: ApplicantNotificationPayload,
    customTransporter?: any
): Promise<SendShortlistEmailResult>;

/**
 * Prepares the initial shortlisting email content without sending. Useful for dry runs and previews.
 */
export function prepareEmail(
    applicant: ApplicantNotificationPayload
): EmailData | null;

/**
 * Validates, prepares, and sends a final interview outcome email to a candidate.
 * If isShortlisted is true, sends a final selection confirmation email.
 * If isShortlisted is false, sends a final rejection notification email.
 *
 * @throws Error if input fails validation or SMTP delivery fails
 */
export function sendFinalShortlistEmail(
    details: FinalShortlistPayload,
    customTransporter?: any
): Promise<SendFinalShortlistEmailResult>;

/**
 * Prepares the final interview outcome email content without sending. Useful for dry runs and previews.
 */
export function prepareFinalShortlistEmail(
    details: FinalShortlistPayload
): EmailData | null;

/**
 * Validates the applicant payload structure and types for initial shortlisting.
 */
export function validateApplicant(
    applicant: any
): ValidationResult;

/**
 * Boolean validation check helper for initial shortlisting.
 */
export function isValidApplicant(
    applicant: any
): boolean;

/**
 * Validates candidate details for the final interview outcome notification.
 */
export function validateFinalShortlistDetails(
    details: any
): ValidationResult;

/**
 * Boolean validation check helper for final shortlist details.
 */
export function isValidFinalShortlistDetails(
    details: any
): boolean;

/**
 * Low-level email sender.
 */
export function sendEmail(
    email: EmailOptions,
    customTransporter?: any
): Promise<any>;

export const transporter: any;
export function setTransporter(transporter: any): void;
export function getTransporter(): any;
export function resetTransporter(): void;
