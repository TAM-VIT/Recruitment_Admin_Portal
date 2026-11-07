const path = require("path");
const fs = require("fs");
const { sendEmail } = require("./mailer");
const { validateFinalShortlistDetails } = require("./validation");

const LOGO_PATH = path.resolve(__dirname, "assets", "LOGO.png");

/**
 * Escapes characters with special meaning in HTML to prevent XSS.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    if (typeof str !== "string") {
        return "";
    }
    return str.replace(/[&<>"']/g, (c) => {
        switch (c) {
            case "&":
                return "&amp;";
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case '"':
                return "&quot;";
            case "'":
                return "&#39;";
            default:
                return c;
        }
    });
}

/**
 * Builds the responsive HTML email template using TAM branding.
 *
 * @param {Object} params
 * @param {string} params.subject - Email subject
 * @param {string} params.headline - Main banner heading
 * @param {string} params.subheading - Secondary subtext
 * @param {string} params.candidateName - Escaped candidate name
 * @param {string} params.bodyHtml - Specific inner paragraphs
 * @returns {string}
 */
function buildHtmlTemplate({ subject, headline, subheading, candidateName, bodyHtml }) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark light">
    <meta name="supported-color-schemes" content="dark light">
    <title>${subject}</title>
    <style>
        :root {
            color-scheme: dark light;
            supported-color-schemes: dark light;
        }
        body {
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            background-color: #0B1220;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            outline: none;
            text-decoration: none;
        }
        @media only screen and (max-width: 620px) {
            .wrapper-table {
                padding: 12px 6px !important;
            }
            .main-container {
                width: 100% !important;
                max-width: 100% !important;
                border-radius: 6px !important;
            }
            .body-padding {
                padding-left: 18px !important;
                padding-right: 18px !important;
            }
            .headline-text {
                font-size: 21px !important;
                line-height: 1.3 !important;
            }
        }
    </style>
</head>

<body bgcolor="#0B1220" style="margin:0;padding:0;background-color:#0B1220;color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B1220" class="wrapper-table" style="background-color:#0B1220;padding:28px 12px;">
<tr><td align="center" bgcolor="#0B1220" style="background-color:#0B1220;">

<!-- Main Centered Container -->
<table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#111C32" class="main-container" style="width:100%;max-width:600px;background-color:#111C32;border:1px solid #263B5A;border-top:3px solid #2563EB;border-radius:8px;overflow:hidden;">

    <!-- Header Section (prominent logo + tagline) -->
    <tr>
        <td align="center" bgcolor="#111C32" style="padding:26px 20px 20px;background-color:#111C32;border-bottom:1px solid #263B5A;">
            <table cellpadding="0" cellspacing="0" border="0" align="center" bgcolor="#111C32" style="background-color:#111C32;margin:0 auto;">
                <tr>
                    <td align="center" bgcolor="#111C32" style="background-color:#111C32;">
                        <img src="cid:tam-club-logo" alt="The AI &amp; ML Club Logo" width="124" height="120" style="display:block;margin:0 auto 10px;border:0;outline:none;text-decoration:none;width:124px;max-width:124px;height:auto;" />
                        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;font-style:italic;color:#94A3B8;letter-spacing:0.3px;line-height:1.4;">
                            It's a place for everyone to learn
                        </div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- Body Content Area -->
    <tr>
        <td bgcolor="#111C32" class="body-padding" style="padding:28px 32px 12px;background-color:#111C32;text-align:left;">

            <div class="headline-text" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:24px;font-weight:700;letter-spacing:-0.3px;line-height:1.3;color:#F1F5F9;margin:0 0 8px;text-align:left;">
                ${headline}
            </div>

            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#94A3B8;line-height:1.5;margin-bottom:22px;text-align:left;">
                ${subheading}
            </div>

            <p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#F1F5F9;">
                Dear <strong style="color:#F1F5F9;font-weight:600;">${candidateName}</strong>,
            </p>

            ${bodyHtml}

            <!-- Closing and Signature -->
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#CBD5E1;margin-bottom:24px;">
                Best regards,<br>
                <strong style="color:#F1F5F9;font-weight:600;">Team TAM</strong><br>
                <span style="font-size:12px;color:#38BDF8;">The AI &amp; ML Club · VIT Vellore</span>
            </div>

        </td>
    </tr>

    <!-- Footer -->
    <tr>
        <td bgcolor="#0B1220" class="body-padding" style="padding:12px 32px;background-color:#0B1220;border-top:1px solid #263B5A;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B1220" style="background-color:#0B1220;">
                <tr>
                    <td align="left" bgcolor="#0B1220" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#94A3B8;background-color:#0B1220;">
                        The AI &amp; ML Club · VIT Vellore
                    </td>
                    <td align="right" bgcolor="#0B1220" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#94A3B8;background-color:#0B1220;">
                        Team TAM
                    </td>
                </tr>
            </table>
        </td>
    </tr>

</table>
</td></tr>
</table>

</body>
</html>
`.trim();
}

/**
 * Prepares the final interview outcome email content (subject, text body, and HTML body)
 * based on whether the candidate is selected or rejected.
 *
 * @param {Object} details
 * @param {string} details.name - Candidate name
 * @param {string} details.email - Candidate email
 * @param {boolean} details.isShortlisted - true if selected, false if rejected
 * @param {string} [details.groupLink] - Optional WhatsApp group link for selected candidates
 * @returns {Object|null} Email configuration object or null if invalid
 */
function prepareFinalShortlistEmail(details) {
    const validation = validateFinalShortlistDetails(details);
    if (!validation.isValid) {
        return null;
    }

    const { name, email, isShortlisted, groupLink } = details;
    const candidateName = name.trim();
    const safeCandidateName = escapeHtml(candidateName);

    const hasGroupLink = isShortlisted && typeof groupLink === "string" && groupLink.trim() !== "";
    const safeGroupLink = hasGroupLink ? escapeHtml(groupLink) : "";

    let subject;
    let message;
    let html;

    if (isShortlisted) {
        subject = "TAM Recruitment – Final Selection Confirmation";

        const whatsappTextSection = hasGroupLink
            ? `\n\nTo stay connected with the team and receive further updates, please join our official WhatsApp group using the link below:\n${groupLink}`
            : "";

        message = `Dear ${candidateName},

Congratulations! We're pleased to inform you that you have been selected to join The AI & ML Club (TAM), VIT Vellore.

We look forward to having you as part of the team.${whatsappTextSection}

Best regards,
Team TAM
The AI & ML Club · VIT Vellore`;

        const whatsappHtmlSection = hasGroupLink
            ? `
            <!-- WhatsApp Group Link Section -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B1220" style="border:1px solid #263B5A;border-left:3px solid #2563EB;border-radius:6px;background-color:#0B1220;margin:0 0 24px;">
                <tr>
                    <td bgcolor="#0B1220" style="padding:16px 20px;background-color:#0B1220;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                        <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#38BDF8;text-transform:uppercase;margin-bottom:6px;">
                            ✦ OFFICIAL WHATSAPP GROUP
                        </div>
                        <div style="font-size:14px;line-height:1.6;color:#F1F5F9;margin-bottom:10px;">
                            To stay connected with the team and receive further updates, please join our official WhatsApp group using the link below.
                        </div>
                        <div>
                            <a href="${safeGroupLink}" target="_blank" rel="noopener noreferrer" style="color:#38BDF8;font-size:14px;font-weight:600;text-decoration:underline;word-break:break-all;">
                                ${safeGroupLink}
                            </a>
                        </div>
                    </td>
                </tr>
            </table>`
            : "";

        const bodyHtml = `
            <p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#CBD5E1;">
                Congratulations! We&#39;re pleased to inform you that you have been selected to join <strong style="color:#38BDF8;font-weight:600;">The AI &amp; ML Club (TAM), VIT Vellore</strong>.
            </p>

            <p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#CBD5E1;">
                We look forward to having you as part of the team.
            </p>
            ${whatsappHtmlSection}
        `.trim();

        html = buildHtmlTemplate({
            subject,
            headline: "FINAL SELECTION CONFIRMATION",
            subheading: "Welcome to The AI &amp; ML Club family!",
            candidateName: safeCandidateName,
            bodyHtml
        });
    } else {
        subject = "TAM Recruitment – Final Application Update";
        message = `Dear ${candidateName},

Thank you for participating in the TAM recruitment process.

Unfortunately, we won't be moving forward with your application this time. We appreciate your interest and wish you the very best.

Best regards,
Team TAM
The AI & ML Club · VIT Vellore`;

        const bodyHtml = `
            <p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#CBD5E1;">
                Thank you for participating in the TAM recruitment process.
            </p>

            <p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#CBD5E1;">
                Unfortunately, we won&#39;t be moving forward with your application this time. We appreciate your interest and wish you the very best.
            </p>
        `.trim();

        html = buildHtmlTemplate({
            subject,
            headline: "APPLICATION UPDATE",
            subheading: "An update regarding your TAM recruitment application.",
            candidateName: safeCandidateName,
            bodyHtml
        });
    }

    const attachments = [];
    if (fs.existsSync(LOGO_PATH)) {
        attachments.push({
            filename: "LOGO.png",
            path: LOGO_PATH,
            cid: "tam-club-logo",
            contentDisposition: "inline",
            contentType: "image/png"
        });
    }

    return {
        to: email,
        subject,
        message,
        text: message,
        html,
        isShortlisted,
        shortlisted: isShortlisted,
        groupLink: hasGroupLink ? groupLink : undefined,
        attachments
    };
}

/**
 * Validates, prepares, and sends a final interview outcome email (selection confirmation or polite rejection).
 *
 * @param {Object} details - Candidate details
 * @param {string} details.name - Candidate name
 * @param {string} details.email - Candidate email address
 * @param {boolean} details.isShortlisted - true for selection confirmation, false for polite rejection
 * @param {string} [details.groupLink] - Optional WhatsApp group link for selected candidates
 * @param {Object} [customTransporter] - Optional custom transporter (e.g. for testing)
 * @returns {Promise<{ success: boolean, recipient: string, isShortlisted: boolean, shortlisted: boolean, messageId: string }>}
 */
async function sendFinalShortlistEmail(details, customTransporter = null) {
    const validation = validateFinalShortlistDetails(details);
    if (!validation.isValid) {
        throw new Error(`Validation Error: ${validation.error}`);
    }

    const emailData = prepareFinalShortlistEmail(details);
    if (!emailData) {
        throw new Error("Unable to prepare email: invalid candidate details.");
    }

    const info = await sendEmail(emailData, customTransporter);

    return {
        success: true,
        recipient: details.email,
        isShortlisted: details.isShortlisted,
        shortlisted: details.isShortlisted,
        messageId: info?.messageId || "sent"
    };
}

module.exports = {
    prepareFinalShortlistEmail,
    sendFinalShortlistEmail
};

