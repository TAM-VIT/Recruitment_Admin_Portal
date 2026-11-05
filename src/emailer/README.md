# Recruitment Portal — Emailer Module (`src/emailer`)

A robust, modular email notification service built with Node.js and Nodemailer for sending recruitment status updates (Interview Invitations & Polite Rejections) with full plain-text fallbacks and responsive HTML templates.

---

## Table of Contents
1. [Module Architecture & File Flow](#module-architecture--file-flow)
2. [How to Call This Module from the Database (Prisma)](#how-to-call-this-module-from-the-database-prisma)
   - [Single Candidate Notification](#1-single-candidate-notification-e-g-admin-action)
   - [Bulk Stage Notifications](#2-bulk-stage-notifications-batch-processing)
3. [File-by-File Execution Flow](#file-by-file-execution-flow)
4. [Deliverability Batch Tester (`batchTest.js`)](#deliverability-batch-tester-batchtestjs)
   - [Purpose](#purpose)
   - [Safety Features](#safety-features)
   - [How to Use](#how-to-use)
5. [Environment Configuration](#environment-configuration)
6. [Running Automated Tests](#running-automated-tests)

---

## Module Architecture & File Flow

When an external caller (such as an Express controller or background worker) calls `sendShortlistEmail()`, the execution flows deterministically through specialized layers:

```mermaid
flowchart TD
    DB[(MongoDB / Prisma Database)] -->|Fetch Candidate| Controller[adminController.ts / Service]
    Controller -->|sendShortlistEmail(payload)| Index[index.js / index.d.ts<br/>Public API Facade]
    
    Index -->|1. Validate Data| Validation[validation.js<br/>validateApplicant()]
    Validation -->|Throws on Invalid| ErrorHandler[Error Handling]
    
    Validation -->|2. Valid Payload| Service[emailService.js<br/>prepareEmail()]
    Service -->|Build Template| Template[Generate Subject, Text & HTML<br/>• Shortlisted: Interview Slot CTA<br/>• Rejected: Polite Rejection]
    
    Service -->|3. Dispatch| Mailer[mailer.js<br/>sendEmail()]
    Mailer -->|Read .env & Attach Headers| Transporter[Nodemailer Gmail Transporter]
    Transporter -->|4. SMTP Delivery| Gmail[Google SMTP Servers]
    Gmail -->|Message ID| Caller[Returns { success, recipient, messageId }]
```

---

## How to Call This Module from the Database (Prisma)

The module is exposed with full TypeScript type definitions via `src/emailer/index.d.ts` and CommonJS exports via `src/emailer/index.js`.

### 1. Single Candidate Notification (e.g., Admin Action)

When an admin updates a candidate's status or advances their stage in `src/controllers/adminController.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { sendShortlistEmail } from '../emailer';

const prisma = new PrismaClient();

export async function notifyCandidate(applicationId: string, isShortlisted: boolean) {
  // 1. Fetch applicant details from the database
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { user: true }
  });

  if (!application || !application.user) {
    throw new Error('Application or candidate user record not found');
  }

  // 2. Call the emailer module
  const result = await sendShortlistEmail({
    name: application.user.name,
    email: application.user.email,
    shortlisted: isShortlisted
  });

  console.log(`Email delivered to ${result.recipient} (Message ID: ${result.messageId})`);
  return result;
}
```

### 2. Bulk Stage Notifications (Batch Processing)

When triggering notifications for multiple candidates from a database query, process them with small intervals to respect SMTP rate limits:

```typescript
import { PrismaClient } from '@prisma/client';
import { sendShortlistEmail } from '../emailer';

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function notifyShortlistedCandidatesByDomain(domain: string) {
  // 1. Query database for qualified applications
  const shortlistedApplicants = await prisma.application.findMany({
    where: {
      domain: domain as any,
      review1Passed: true,
      stage: 'REVIEW1'
    },
    include: { user: true }
  });

  console.log(`Found ${shortlistedApplicants.length} applicants to notify.`);

  // 2. Send emails with a safe delay between deliveries
  for (const app of shortlistedApplicants) {
    try {
      await sendShortlistEmail({
        name: app.user.name,
        email: app.user.email,
        shortlisted: true
      });
      console.log(`[SUCCESS] Notified: ${app.user.email}`);
      
      // 1.5 second throttle between SMTP dispatches
      await sleep(1500);
    } catch (err: any) {
      console.error(`[FAILED] Could not send to ${app.user.email}:`, err.message);
      // Continue loop without crashing entire process
    }
  }
}
```

---

## File-by-File Execution Flow

| Step | File | Role & Behavior |
| :--- | :--- | :--- |
| **1. Entry Point** | [`index.js`](./index.js) / [`index.d.ts`](./index.d.ts) | Public API facade. Re-exports `sendShortlistEmail`, `prepareEmail`, `validateApplicant`, and mailer utilities. Provides TypeScript types. |
| **2. Validation** | [`validation.js`](./validation.js) | Validates input structure using `validateApplicant()`. Requires non-empty string `name`, RFC email regex format, and strict boolean `shortlisted` (with legacy `status` fallback). |
| **3. Templating** | [`emailService.js`](./emailService.js) | Constructs email content using `prepareEmail()`. Builds transactional subject lines, plain text fallbacks, and mobile-friendly HTML tables. |
| **4. Transport** | [`mailer.js`](./mailer.js) | Manages the Nodemailer Gmail transporter, loads environment credentials from `.env`, injects deliverability headers (`Reply-To`, `X-Priority: 3`), and dispatches SMTP calls. |
| **5. Testing** | [`emailer.test.js`](./emailer.test.js) | Automated test suite (16 unit & integration tests) covering validation, template rendering, and mocked SMTP delivery. |
| **6. Manual Tool** | [`batchTest.js`](./batchTest.js) | Interactive terminal CLI for real deliverability tests, recipient warm-up, and spam troubleshooting. |

### Payload Schema & Validation (`validation.js`)

All inputs to `sendShortlistEmail(applicant)` and `prepareEmail(applicant)` are validated by `validateApplicant()` before processing:

| Field | Type | Required | Validation Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | Non-empty string (trimmed) | Candidate's full name. |
| `email` | `string` | **Yes** | RFC regex format (`^[^\s@]+@[^\s@]+\.[^\s@]+$`) | Destination email address. |
| `shortlisted` | `boolean` | **Yes** | Strict boolean (`true` or `false`) | `true` sends Interview Invitation; `false` sends Polite Rejection. |
| `status` | `string` | Optional | `"shortlisted"` or `"not shortlisted"` | Legacy backwards-compatibility string if `shortlisted` boolean is omitted. |

---

## Deliverability Batch Tester (`batchTest.js`)

### Purpose
Before deploying or triggering automated emails to hundreds of real student applicants, `batchTest.js` provides an **interactive, risk-free staging sandbox** to:
1. Verify real-world SMTP authentication and Google App Password setup.
2. Confirm deliverability across multiple recipient inboxes (Gmail, institutional, Outlook).
3. Test inbox placement (verifying whether emails land in **Primary Inbox**, **Promotions**, or **Spam**).
4. Inspect visual layout across mobile and desktop mail clients without touching the database.

### Safety Features
- **Schema Validation**: Validates candidate objects against `validateApplicant` (skipping entries with invalid email regex, empty names, or missing shortlisted flags with clear terminal warnings).
- **Empty Email Detection**: Automatically skips entries with missing or blank emails.
- **Duplicate Prevention**: Normalizes email addresses (trimmed & lowercased) and skips duplicate recipients within the same execution.
- **Confirmation Gate**: Halts execution and requires explicit terminal input (`yes` or `y`) before dispatching any real emails.
- **Configurable Throttling**: Customizable `BATCH_SIZE`, `DELAY_BETWEEN_EMAILS_MS`, and `DELAY_BETWEEN_BATCHES_MS` to avoid bursting the SMTP server.
- **Fault-Tolerant Loop**: Catches per-recipient SMTP errors and continues with the rest of the queue without throwing or aborting.
- **Deliverability Health Check**: Warns if `EMAIL_FROM` inside `<...>` does not match `EMAIL_USER` (preventing Gmail spoofing detection).

### How to Use
1. Open [`src/emailer/batchTest.js`](./batchTest.js) and populate the `candidates` array:
   ```javascript
   const candidates = [
     {
       name: "Test Candidate 1",
       email: "jhon.doe2023@gmail.com",
       shortlisted: true  // Receives Interview Invitation
     },
     {
       name: "Test Candidate 2",
       email: "jhon.doe2023@gmail.com",
       shortlisted: false // Receives Polite Rejection
     }
   ];
   ```
2. Execute the script from the project root:
   ```bash
   node src/emailer/batchTest.js
   ```
3. Type `yes` when prompted by the terminal confirmation.
4. Follow the warm-up instructions printed in the summary if any email is placed in the Spam folder during initial testing:
   - Click **"Report not spam"** in the recipient inbox.
   - Reply to the email with a brief acknowledgement.
   - Add the sender to Google Contacts.

---

## Environment Configuration

Configuration is loaded from the root `.env` file:

```env
# Gmail account used for SMTP authentication
EMAIL_USER=jhon.doe2023@gmail.com

# 16-character Google App Password (generated from Google Account Security)
EMAIL_APP_PASSWORD=your_16_char_app_password

# Display name and From header (the email address MUST match EMAIL_USER)
EMAIL_FROM="Club Recruitment Team <jhon.doe2023@gmail.com>"

# Optional: Dedicated reply-to inbox for applicant queries
EMAIL_REPLY_TO=jhon.doe2023@gmail.com
```

---

## Running Automated Tests

Run the built-in Node.js test runner suite:

```bash
npm test
```

This executes all 16 tests in [`src/emailer/emailer.test.js`](./emailer.test.js) without dispatching any real network emails (using mocked transporters).
