/**
 * Type declarations for the emailer module.
 */

export interface ApplicantNotificationPayload {
    name: string;
    email: string;
    shortlisted: boolean;
    status?: string;
}

export interface EmailData {
    to: string;
    subject: string;
    message: string;
    html: string;
    shortlisted: boolean;
    attachments?: any[];
}

export interface SendShortlistEmailResult {
    success: boolean;
    recipient: string;
    shortlisted: boolean;
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
 * Validates, prepares, and sends an email notification to a candidate.
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
 * Prepares the email content without sending. Useful for dry runs and previews.
 */
export function prepareEmail(
    applicant: ApplicantNotificationPayload
): EmailData | null;

/**
 * Validates the applicant payload structure and types.
 */
export function validateApplicant(
    applicant: any
): ValidationResult;

/**
 * Boolean validation check helper.
 */
export function isValidApplicant(
    applicant: any
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
