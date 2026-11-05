const path = require("path");
const fs = require("fs");
const { sendEmail } = require("./mailer");
const { validateApplicant } = require("./validation");

const LOGO_PATH = path.resolve(__dirname, "assets", "LOGO.png");

/**
 * Prepares the email content (subject, text body, and HTML body)
 * depending on whether the candidate is shortlisted or rejected.
 *
 * @param {Object} applicant
 * @param {string} applicant.name - Candidate name
 * @param {string} applicant.email - Candidate email
 * @param {boolean} [applicant.shortlisted] - True if shortlisted, false if rejected
 * @param {string} [applicant.status] - Legacy status string
 * @returns {Object|null} Email configuration object or null if invalid
 */
function prepareEmail(applicant) {
    if (!applicant || typeof applicant !== "object") {
        return null;
    }

    let isShortlisted;
    if (typeof applicant.shortlisted === "boolean") {
        isShortlisted = applicant.shortlisted;
    } else if (applicant.status === "shortlisted") {
        isShortlisted = true;
    } else if (applicant.status === "not shortlisted") {
        isShortlisted = false;
    } else {
        return null;
    }

    const candidateName = (applicant.name || "Candidate").trim();

    let subject;
    let message;
    let html;

    if (isShortlisted) {
        subject = "Recruitment Update: Shortlisted for Interview";
        message = `Dear ${candidateName},

Congratulations! We are pleased to inform you that you have been shortlisted for the next stage of our recruitment process.

We were very impressed by your application and profile. The next step in our process is an interview round with our domain leads. Please log in to your candidate recruitment portal at your earliest convenience to select your preferred interview slot.

If you have any questions or require accommodations, feel free to reply directly to this email.

Best regards,
Recruitment Team`;

        html = `
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
            .callout-box {
                padding: 14px 16px !important;
            }
        }
    </style>
</head>

<body bgcolor="#0B1220" style="margin:0;padding:0;background-color:#0B1220;color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B1220" class="wrapper-table" style="background-color:#0B1220;padding:28px 12px;">
<tr><td align="center" bgcolor="#0B1220" style="background-color:#0B1220;">

<!-- Main Centered Container -->
<table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#111C32" class="main-container" style="width:100%;max-width:600px;background-color:#111C32;border:1px solid #263B5A;border-top:3px solid #2563EB;border-radius:8px;overflow:hidden;">

    <!-- Header Section (100–150px vertical height with prominent logo) -->
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

    <!-- Body Content Area (Left-aligned, natural hierarchy) -->
    <tr>
        <td bgcolor="#111C32" class="body-padding" style="padding:28px 32px 12px;background-color:#111C32;text-align:left;">

            <!-- Single Prominent Natural Heading -->
            <div class="headline-text" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:24px;font-weight:700;letter-spacing:-0.3px;line-height:1.3;color:#F1F5F9;margin:0 0 8px;text-align:left;">
                YOU'VE MADE THE LIST!
            </div>

            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#94A3B8;line-height:1.5;margin-bottom:22px;text-align:left;">
                Your journey with TAM moves to its next chapter.
            </div>

            <!-- Greeting and Congratulatory Message -->
            <p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#F1F5F9;">
                Dear <strong style="color:#F1F5F9;font-weight:600;">${candidateName}</strong>,
            </p>

            <p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#CBD5E1;">
                We are delighted to inform you that you have been <strong style="color:#38BDF8;font-weight:600;">shortlisted</strong> for the next stage of the TAM recruitment process!
            </p>

            <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#CBD5E1;">
                Your application stood out to our review team, and we're excited to see what you bring to the table. This is just the beginning.
            </p>

            <!-- Clearly Identifiable Next-Steps Section -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B1220" class="callout-box" style="border:1px solid #263B5A;border-left:3px solid #2563EB;border-radius:6px;background-color:#0B1220;margin:0 0 22px;">
                <tr>
                    <td bgcolor="#0B1220" style="padding:16px 20px;background-color:#0B1220;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                        <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#38BDF8;text-transform:uppercase;margin-bottom:4px;">
                            ✦ WHAT HAPPENS NEXT?
                        </div>
                        <div style="font-size:16px;font-weight:600;color:#F1F5F9;margin-bottom:6px;">
                            Select your interview slot
                        </div>
                        <div style="font-size:13px;line-height:1.6;color:#94A3B8;">
                            Log in to your candidate recruitment portal to choose your preferred interview slot with our domain leads.
                        </div>
                    </td>
                </tr>
            </table>

            <!-- Closing and Support Info -->
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.6;margin:0 0 18px;color:#94A3B8;">
                If you have any questions or require accommodations, feel free to contact us on WhatsApp.
            </p>

            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#CBD5E1;margin-bottom:24px;">
                Best regards,<br>
                <strong style="color:#F1F5F9;font-weight:600;">The Recruitment Desk</strong><br>
                <span style="font-size:12px;color:#38BDF8;">The AI &amp; ML Club · VIT Vellore</span>
            </div>

        </td>
    </tr>

    <!-- Clean, Understated Footer -->
    <tr>
        <td bgcolor="#0B1220" class="body-padding" style="padding:12px 32px;background-color:#0B1220;border-top:1px solid #263B5A;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B1220" style="background-color:#0B1220;">
                <tr>
                    <td align="left" bgcolor="#0B1220" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#94A3B8;background-color:#0B1220;">
                        The AI &amp; ML Club · VIT Vellore
                    </td>
                    <td align="right" bgcolor="#0B1220" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#94A3B8;background-color:#0B1220;">
                        Recruitment Desk
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
    } else {
        subject = "Recruitment Application Update";
        message = `Dear ${candidateName},

Thank you for your interest and for taking the time to apply for our recruitment drive.

We received a large number of impressive applications this season. After comprehensive review, we regret to inform you that we will not be moving forward with your candidacy for this round.

Please know that our decision was difficult and competitive, and is in no way a reflection of your worth or potential. We genuinely appreciate the effort you put into your application, and you remain a valued member of our student and club community. We warmly encourage you to apply again during our future recruitment cycles.

We wish you all the very best in your academic and professional endeavors.

Warm regards,
Recruitment Team`;

        html = `
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
            .callout-box {
                padding: 14px 16px !important;
            }
        }
    </style>
</head>

<body bgcolor="#0B1220" style="margin:0;padding:0;background-color:#0B1220;color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B1220" class="wrapper-table" style="background-color:#0B1220;padding:28px 12px;">
<tr><td align="center" bgcolor="#0B1220" style="background-color:#0B1220;">

<!-- Main Centered Container -->
<table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#111C32" class="main-container" style="width:100%;max-width:600px;background-color:#111C32;border:1px solid #263B5A;border-top:3px solid #2563EB;border-radius:8px;overflow:hidden;">

    <!-- Header Section (100–150px vertical height with prominent logo) -->
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

    <!-- Body Content Area (Left-aligned, natural hierarchy) -->
    <tr>
        <td bgcolor="#111C32" class="body-padding" style="padding:28px 32px 12px;background-color:#111C32;text-align:left;">

            <!-- Single Prominent Respectful Heading -->
            <div class="headline-text" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.3px;line-height:1.3;color:#F1F5F9;margin:0 0 8px;text-align:left;">
                EVERY STORY HAS ITS CHAPTER.
            </div>

            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#94A3B8;line-height:1.5;margin-bottom:22px;text-align:left;">
                An update regarding your TAM recruitment application.
            </div>

            <!-- Greeting and Rejection Message -->
            <p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#F1F5F9;">
                Dear <strong style="color:#F1F5F9;font-weight:600;">${candidateName}</strong>,
            </p>

            <p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#CBD5E1;">
                Thank you for your interest in the TAM recruitment drive and for taking the time to share your application with us.
            </p>

            <p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#CBD5E1;">
                We received an exceptionally large number of applications this season. After careful consideration, we regret to inform you that we will not be moving forward with your application for this recruitment cycle.
            </p>

            <p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#CBD5E1;">
                This was a highly competitive process, and this outcome does not diminish your abilities, efforts, or potential. We genuinely appreciate the enthusiasm you showed in being a part of TAM.
            </p>

            <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#CBD5E1;">
                We hope this is not the end of your story with us. We warmly encourage you to apply again in future recruitment cycles.
            </p>

            <!-- Restrained Presentation of Encouraging Quote -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B1220" class="callout-box" style="border:1px solid #263B5A;border-left:3px solid #38BDF8;border-radius:6px;background-color:#0B1220;margin:0 0 22px;">
                <tr>
                    <td bgcolor="#0B1220" style="padding:16px 20px;background-color:#0B1220;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                        <div style="font-size:14px;font-style:italic;line-height:1.6;color:#F1F5F9;">
                            "Every opportunity is a chance to learn, grow, and begin again."
                        </div>
                    </td>
                </tr>
            </table>

            <!-- Closing and Signature -->
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.6;margin:0 0 18px;color:#94A3B8;">
                We wish you every success in your academic and professional journey. Thank you once again for considering TAM.
            </p>

            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#CBD5E1;margin-bottom:24px;">
                Warm regards,<br>
                <strong style="color:#F1F5F9;font-weight:600;">The Recruitment Desk</strong><br>
                <span style="font-size:12px;color:#38BDF8;">The AI &amp; ML Club · VIT Vellore</span>
            </div>

        </td>
    </tr>

    <!-- Clean, Understated Footer -->
    <tr>
        <td bgcolor="#0B1220" class="body-padding" style="padding:12px 32px;background-color:#0B1220;border-top:1px solid #263B5A;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B1220" style="background-color:#0B1220;">
                <tr>
                    <td align="left" bgcolor="#0B1220" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#94A3B8;background-color:#0B1220;">
                        The AI &amp; ML Club · VIT Vellore
                    </td>
                    <td align="right" bgcolor="#0B1220" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#94A3B8;background-color:#0B1220;">
                        Recruitment Desk
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
        to: applicant.email,
        subject,
        message,
        html,
        shortlisted: isShortlisted,
        attachments
    };
}

/**
 * Validates, prepares, and sends a shortlist or polite rejection email.
 *
 * @param {Object} applicant - Candidate details
 * @param {string} applicant.name - Candidate full name
 * @param {string} applicant.email - Candidate email address
 * @param {boolean} applicant.shortlisted - true for interview invite, false for polite rejection
 * @param {Object} [customTransporter] - Optional custom transporter (e.g. for testing)
 * @returns {Promise<{ success: boolean, recipient: string, shortlisted: boolean, messageId: string, emailData: Object, info: Object }>}
 */
async function sendShortlistEmail(applicant, customTransporter = null) {
    const validation = validateApplicant(applicant);
    if (!validation.isValid) {
        throw new Error(`Validation Error: ${validation.error}`);
    }

    const emailData = prepareEmail(applicant);
    if (!emailData) {
        throw new Error("Unable to prepare email: invalid applicant status or data.");
    }

    const info = await sendEmail(emailData, customTransporter);

    const isShortlisted = typeof applicant.shortlisted === "boolean"
        ? applicant.shortlisted
        : (applicant.status === "shortlisted");

    return {
        success: true,
        recipient: applicant.email,
        shortlisted: isShortlisted,
        messageId: info?.messageId || "sent"
    };
}

module.exports = {
    prepareEmail,
    sendShortlistEmail
};
