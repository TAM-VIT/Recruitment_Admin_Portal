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
    <title>${subject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=IM+Fell+English:ital@0;1&family=Old+Standard+TT:wght@400;700&family=UnifrakturMaguntia&display=swap" rel="stylesheet">
</head>

<body style="margin:0;padding:0;background:#211b17;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#211b17" style="padding:25px 10px;">
<tr><td align="center">

<table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#eee4c9" style="width:100%;max-width:600px;color:#29231d;">

    <!-- Newspaper metadata -->
    <tr>
        <td style="padding:18px 25px 7px;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="font-family:'Old Standard TT',Georgia,serif;font-size:10px;letter-spacing:1.5px;color:#514638;">
                        VOLUME I · RECRUITMENT EDITION
                    </td>
                    <td align="right" style="font-family:'Old Standard TT',Georgia,serif;font-size:10px;letter-spacing:1.5px;color:#514638;">
                        THE AI &amp; ML CLUB
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- Masthead -->
    <tr>
        <td style="padding:0 25px;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" style="border-top:2px solid #29231d;border-bottom:1px solid #29231d;padding:16px 0 14px;">
                        <img src="cid:tam-club-logo" alt="The AI &amp; ML Club Logo" width="105" height="102" style="display:block;margin:0 auto 8px;border:0;outline:none;text-decoration:none;max-width:105px;height:auto;" />
                        <div style="font-family:'IM Fell English',Georgia,serif;font-size:13px;font-style:italic;color:#71634e;">
                            It's a place for everyone to learn
                        </div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- Edition strip -->
    <tr>
        <td style="padding:9px 25px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #71634e;">
                <tr>
                    <td width="50%" align="center" style="padding:7px 3px;font-family:'Old Standard TT',Georgia,serif;font-size:10px;font-weight:bold;letter-spacing:0.12em;color:#514638;border-right:1px solid #71634e;">
                        CLUB RECRUITMENT
                    </td>
                    <td width="50%" align="center" style="padding:7px 3px;font-family:'Old Standard TT',Georgia,serif;font-size:10px;font-weight:bold;letter-spacing:0.12em;color:#514638;">
                        SHORTLIST ANNOUNCEMENT
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- Headline -->
    <tr>
        <td align="center" style="padding:28px 25px 15px;">
            <div style="font-family:'Old Standard TT',Georgia,serif;font-size:11px;font-weight:bold;letter-spacing:0.12em;color:#963d35;margin-bottom:12px;">
                ✦ AN ANNOUNCEMENT FROM THE RECRUITMENT DESK ✦
            </div>

            <div style="font-family:'Anton',Impact,sans-serif;font-size:43px;font-weight:400;letter-spacing:-0.01em;line-height:1.08;text-transform:uppercase;color:#963d35;">
                YOU'VE MADE<br>THE LIST!
            </div>

            <div style="font-family:'IM Fell English',Georgia,serif;font-size:14px;font-style:italic;line-height:1.6;color:#75654e;margin-top:12px;">
                Your journey with TAM moves to its next chapter.
            </div>
        </td>
    </tr>

    <!-- Divider -->
    <tr>
        <td style="padding:0 25px;">
            <div style="border-top:2px solid #29231d;border-bottom:1px solid #29231d;height:3px;"></div>
        </td>
    </tr>

    <!-- Message -->
    <tr>
        <td style="padding:21px 30px;font-family:'IM Fell English',Georgia,serif;font-size:15px;line-height:1.8;color:#30291f;">
            <p style="margin:0 0 12px;">Dear <strong>${candidateName}</strong>,</p>

            <p style="margin:0 0 13px;">
                We are delighted to inform you that you have been
                <strong>shortlisted</strong> for the next stage of the TAM recruitment process!
            </p>

            <p style="margin:0;">
                Your application stood out to our review team, and we're excited to see what you bring to the table.
                This is just the beginning.
            </p>
        </td>
    </tr>

    <!-- Next step bulletin -->
    <tr>
        <td style="padding:0 25px 18px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #514638;">
                <tr>
                    <td align="center" style="padding:9px;background:#ded0ae;border-bottom:1px solid #514638;font-family:'Old Standard TT',Georgia,serif;font-size:11px;font-weight:bold;letter-spacing:0.12em;color:#963d35;">
                        ✦ WHAT HAPPENS NEXT? ✦
                    </td>
                </tr>
                <tr>
                    <td style="padding:18px;font-family:'IM Fell English',Georgia,serif;color:#30291f;">
                        <div style="font-size:18px;font-weight:bold;margin-bottom:8px;">
                            Select your interview slot
                        </div>
                        <div style="font-size:14px;line-height:1.8;">
                            Log in to your candidate recruitment portal to choose your preferred interview slot with our domain leads.
                        </div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- Closing -->
    <tr>
        <td style="padding:0 30px 25px;font-family:'IM Fell English',Georgia,serif;color:#30291f;">
            <p style="font-size:14px;line-height:1.8;margin:0 0 17px;">
                If you have any questions or require accommodations, feel free to contact us on WhatsApp.
            </p>
            <div style="font-size:15px;line-height:1.7;">
                Best regards,<br>
                <strong>The Recruitment Desk</strong>
            </div>
            <div style="font-size:12px;font-style:italic;color:#75654e;margin-top:3px;">
                AI &amp; ML Club · VIT Vellore
            </div>
        </td>
    </tr>

    <!-- Footer -->
    <tr>
        <td style="padding:12px 25px;background:#ded0ae;border-top:2px solid #514638;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="font-family:'Old Standard TT',Georgia,serif;font-size:10px;font-weight:bold;letter-spacing:0.12em;color:#514638;">
                        THE TAM TIMES
                    </td>
                    <td align="right" style="font-family:'Old Standard TT',Georgia,serif;font-size:10px;letter-spacing:0.12em;color:#514638;">
                        RECRUITMENT DESK
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
    <title>${subject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=IM+Fell+English:ital@0;1&family=Old+Standard+TT:wght@400;700&family=UnifrakturMaguntia&display=swap" rel="stylesheet">
</head>

<body style="margin:0;padding:0;background:#211b17;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#211b17" style="padding:25px 10px;">
<tr><td align="center">

<table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#eee4c9" style="width:100%;max-width:600px;color:#29231d;">

    <!-- Newspaper metadata -->
    <tr>
        <td style="padding:18px 25px 7px;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="font-family:'Old Standard TT',Georgia,serif;font-size:10px;letter-spacing:1.5px;color:#514638;">
                        VOLUME I · RECRUITMENT EDITION
                    </td>
                    <td align="right" style="font-family:'Old Standard TT',Georgia,serif;font-size:10px;letter-spacing:1.5px;color:#514638;">
                        THE AI &amp; ML CLUB
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- Masthead -->
    <tr>
        <td style="padding:0 25px;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" style="border-top:2px solid #29231d;border-bottom:1px solid #29231d;padding:16px 0 14px;">
                        <img src="cid:tam-club-logo" alt="The AI &amp; ML Club Logo" width="105" height="102" style="display:block;margin:0 auto 8px;border:0;outline:none;text-decoration:none;max-width:105px;height:auto;" />
                        <div style="font-family:'IM Fell English',Georgia,serif;font-size:13px;font-style:italic;color:#71634e;">
                            It's a place for everyone to learn
                        </div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- Edition strip -->
    <tr>
        <td style="padding:9px 25px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #71634e;">
                <tr>
                    <td width="50%" align="center" style="padding:7px 3px;font-family:'Old Standard TT',Georgia,serif;font-size:10px;font-weight:bold;letter-spacing:0.12em;color:#514638;border-right:1px solid #71634e;">
                        CLUB RECRUITMENT
                    </td>
                    <td width="50%" align="center" style="padding:7px 3px;font-family:'Old Standard TT',Georgia,serif;font-size:10px;font-weight:bold;letter-spacing:0.12em;color:#514638;">
                        APPLICATION UPDATE
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- Headline -->
    <tr>
        <td align="center" style="padding:28px 25px 15px;">
            <div style="font-family:'Old Standard TT',Georgia,serif;font-size:11px;font-weight:bold;letter-spacing:0.12em;color:#75654e;margin-bottom:12px;">
                A MESSAGE FROM THE RECRUITMENT DESK
            </div>

            <div style="font-family:'Anton',Impact,sans-serif;font-size:40px;font-weight:400;letter-spacing:-0.01em;line-height:1.1;text-transform:uppercase;color:#29231d;">
                EVERY STORY<br>HAS ITS CHAPTER.
            </div>

            <div style="font-family:'IM Fell English',Georgia,serif;font-size:14px;font-style:italic;line-height:1.6;color:#75654e;margin-top:12px;">
                An update regarding your TAM recruitment application.
            </div>
        </td>
    </tr>

    <!-- Divider -->
    <tr>
        <td style="padding:0 25px;">
            <div style="border-top:2px solid #29231d;border-bottom:1px solid #29231d;height:3px;"></div>
        </td>
    </tr>

    <!-- Message -->
    <tr>
        <td style="padding:21px 30px;font-family:'IM Fell English',Georgia,serif;font-size:15px;line-height:1.85;color:#30291f;">

            <p style="margin:0 0 12px;">Dear <strong>${candidateName}</strong>,</p>

            <p style="margin:0 0 14px;">
                Thank you for your interest in the TAM recruitment drive and for taking the time to share your application with us.
            </p>

            <p style="margin:0 0 14px;">
                We received an exceptionally large number of applications this season. After careful consideration, we regret to inform you that we will not be moving forward with your application for this recruitment cycle.
            </p>

            <p style="margin:0 0 14px;">
                This was a highly competitive process, and this outcome does not diminish your abilities, efforts, or potential. We genuinely appreciate the enthusiasm you showed in being a part of TAM.
            </p>

            <p style="margin:0;">
                We hope this is not the end of your story with us. We warmly encourage you to apply again in future recruitment cycles.
            </p>

        </td>
    </tr>

    <!-- Editorial quote -->
    <tr>
        <td style="padding:0 25px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #514638;border-bottom:1px solid #514638;">
                <tr>
                    <td align="center" style="padding:19px 15px;">
                        <div style="font-family:'IM Fell English',Georgia,serif;font-size:18px;font-style:italic;line-height:1.6;color:#514638;">
                            "Every opportunity is a chance to learn, grow, and begin again."
                        </div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- Closing -->
    <tr>
        <td style="padding:0 30px 25px;font-family:'IM Fell English',Georgia,serif;color:#30291f;">
            <p style="font-size:14px;line-height:1.8;margin:0 0 17px;">
                We wish you every success in your academic and professional journey. Thank you once again for considering TAM.
            </p>
            <div style="font-size:15px;line-height:1.7;">
                Warm regards,<br>
                <strong>The Recruitment Desk</strong>
            </div>
            <div style="font-size:12px;font-style:italic;color:#75654e;margin-top:3px;">
                AI &amp; ML Club · VIT Vellore
            </div>
        </td>
    </tr>

    <!-- Footer -->
    <tr>
        <td style="padding:12px 25px;background:#ded0ae;border-top:2px solid #514638;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="font-family:'Old Standard TT',Georgia,serif;font-size:10px;font-weight:bold;letter-spacing:0.12em;color:#514638;">
                        THE TAM TIMES
                    </td>
                    <td align="right" style="font-family:'Old Standard TT',Georgia,serif;font-size:10px;letter-spacing:0.12em;color:#514638;">
                        RECRUITMENT DESK
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
      cid: "tam-club-logo"
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
