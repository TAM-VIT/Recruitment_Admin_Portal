# Recruitment Portal — Emailer Module (`src/emailer`)

A robust, modular email notification service built with Node.js and Nodemailer for sending recruitment status updates with full plain-text fallbacks and responsive HTML templates.

The module supports two distinct recruitment stages:
1. **Initial Application Shortlisting** (`sendShortlistEmail`): Invites candidates to interview or politely rejects initial applications.
2. **Final Interview Outcomes** (`sendFinalShortlistEmail`): Communicates final selection confirmation or final post-interview application updates.

---

## Table of Contents
1. [Module Architecture & File Flow](#module-architecture--file-flow)
2. [How to Call This Module from the Database (Prisma)](#how-to-call-this-module-from-the-database-prisma)
   - [Initial Application Shortlisting](#1-initial-application-shortlisting)
   - [Final Interview Outcomes (Selection & Rejection)](#2-final-interview-outcomes-selection--rejection)
   - [Bulk Stage Notifications (Batch Processing)](#3-bulk-stage-notifications-batch-processing)
3. [File-by-File Execution Flow](#file-by-file-execution-flow)
   - [Initial Shortlist Schema (`validation.js`)](#initial-shortlist-schema-validationjs)
   - [Final Shortlist Schema (`validation.js`)](#final-shortlist-schema-validationjs)
4. [Deliverability Batch Testers](#deliverability-batch-testers)
   - [Initial Shortlist Tester (`batchTest.js`)](#initial-shortlist-tester-batchtestjs)
   - [Final Shortlist Tester (`batchTestFinalShortlist.js`)](#final-shortlist-tester-batchtestfinalshortlistjs)
5. [Environment Configuration](#environment-configuration)
6. [Running Automated Tests](#running-automated-tests)

---

## Module Architecture & File Flow

When an external caller (such as an Express controller or background worker) calls `sendShortlistEmail()` or `sendFinalShortlistEmail()`, execution flows deterministically through specialized layers:

```mermaid
flowchart TD
    DB[(MongoDB / Prisma Database)] -->|Fetch Candidate| Controller[adminController.ts / Service]
    
    Controller -->|Initial Round: sendShortlistEmail(payload)| Index[index.js / index.d.ts<br/>Public API Facade]
    Controller -->|Final Round: sendFinalShortlistEmail(payload)| Index

    Index -->|Initial Stage| Service[emailService.js<br/>prepareEmail()]
    Index -->|Final Stage| FinalService[FinalShortlistEmailer.js<br/>prepareFinalShortlistEmail()]

    Service -->|Validate| Validation[validation.js<br/>validateApplicant()]
    FinalService -->|Validate| FinalValidation[validation.js<br/>validateFinalShortlistDetails()]

    Service -->|Dispatch| Mailer[mailer.js<br/>sendEmail()]
    FinalService -->|Dispatch| Mailer

    Mailer -->|Read .env & Headers| Transporter[Nodemailer Transporter]
    Transporter -->|SMTP Delivery| Gmail[Google SMTP Servers]
    Gmail -->|Message ID| Caller[Returns { success, recipient, messageId }]
```

---

## How to Call This Module from the Database (Prisma)

The module is exposed with full TypeScript type definitions via `src/emailer/index.d.ts` and CommonJS exports via `src/emailer/index.js`.

### 1. Initial Application Shortlisting

When updating initial review status:

```typescript
import { sendShortlistEmail } from '../emailer';

// Interview Shortlist Email
await sendShortlistEmail({
  name: "Rahul Sharma",
  email: "rahul@vitstudent.ac.in",
  shortlisted: true
});

// Initial Application Polite Rejection
await sendShortlistEmail({
  name: "Priya Patel",
  email: "priya@vitstudent.ac.in",
  shortlisted: false
});
```

### 2. Final Interview Outcomes (Selection & Rejection)

When releasing final outcomes after domain interviews, call `sendFinalShortlistEmail()` with `{ name, email, isShortlisted, groupLink? }`:

- `isShortlisted: true` sends **`TAM Recruitment – Final Selection Confirmation`** and includes the WhatsApp group link section (when `groupLink` is provided).
- `isShortlisted: false` sends **`TAM Recruitment – Final Application Update`** (rejection emails ignore `groupLink`).

> **Note on `groupLink`**: The `groupLink` parameter is **optional** at the validation layer. If omitted or empty for a shortlisted candidate, the email is sent without a broken or empty link. Rejection emails never include the WhatsApp group link under any circumstance.

```typescript
import { sendFinalShortlistEmail } from '../emailer';

// Final Selection Confirmation (with WhatsApp group link)
const selectionResult = await sendFinalShortlistEmail({
  name: "Rahul Sharma",
  email: "rahul@vitstudent.ac.in",
  isShortlisted: true,
  groupLink: "https://chat.whatsapp.com/example"
});
console.log(`Delivered confirmation to ${selectionResult.recipient} (ID: ${selectionResult.messageId})`);

// Final Application Rejection Update (groupLink is ignored)
const rejectionResult = await sendFinalShortlistEmail({
  name: "Amit Kumar",
  email: "amit@vitstudent.ac.in",
  isShortlisted: false
});
console.log(`Delivered update to ${rejectionResult.recipient} (ID: ${rejectionResult.messageId})`);
```

### 3. Bulk Stage Notifications (Batch Processing)

When triggering notifications for multiple candidates from a database query, process them with small intervals to respect SMTP rate limits:

```typescript
import { PrismaClient } from '@prisma/client';
import { sendFinalShortlistEmail } from '../emailer';

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function notifyFinalInterviewCandidates() {
  const applicants = await prisma.application.findMany({
    where: { stage: 'REVIEW2' },
    include: { user: true }
  });

  for (const app of applicants) {
    try {
      await sendFinalShortlistEmail({
        name: app.user.name,
        email: app.user.email,
        isShortlisted: app.review2Passed
      });
      console.log(`[SUCCESS] Notified: ${app.user.email}`);
      await sleep(1500);
    } catch (err: any) {
      console.error(`[FAILED] Could not send to ${app.user.email}:`, err.message);
    }
  }
}
```

---

## File-by-File Execution Flow

| Step | File | Role & Behavior |
| :--- | :--- | :--- |
| **1. Entry Point** | [`index.js`](./index.js) / [`index.d.ts`](./index.d.ts) | Public API facade. Re-exports `sendShortlistEmail`, `sendFinalShortlistEmail`, `prepareEmail`, `prepareFinalShortlistEmail`, validation functions, and mailer utilities. |
| **2. Validation** | [`validation.js`](./validation.js) | Validates payloads. `validateApplicant()` for initial stage; `validateFinalShortlistDetails()` for final outcomes. |
| **3. Initial Templating** | [`emailService.js`](./emailService.js) | Handles initial round templates (`prepareEmail()`) — interview slots and initial rejections. |
| **4. Final Templating** | [`FinalShortlistEmailer.js`](./FinalShortlistEmailer.js) | Handles final interview outcomes (`prepareFinalShortlistEmail()` / `sendFinalShortlistEmail()`) — final selection and post-interview updates. |
| **5. Transport** | [`mailer.js`](./mailer.js) | Manages Nodemailer Gmail transporter, `.env` credentials, deliverability headers, and SMTP dispatches. |
| **6. Testing** | [`emailer.test.js`](./emailer.test.js) | Automated test suite (34 unit & integration tests) covering all validation cases, templates, and mocked deliveries. |
| **7. Manual Testers** | [`batchTest.js`](./batchTest.js) & [`batchTestFinalShortlist.js`](./batchTestFinalShortlist.js) | Standalone interactive CLIs for real deliverability tests, recipient warm-up, and spam troubleshooting. |

### Initial Shortlist Schema (`validation.js`)

Used by `sendShortlistEmail(applicant)` and `prepareEmail(applicant)`:

| Field | Type | Required | Validation Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | Non-empty string (trimmed) | Candidate full name. |
| `email` | `string` | **Yes** | RFC regex format | Destination email address. |
| `shortlisted` | `boolean` | **Yes** | Strict boolean (`true` or `false`) | `true` sends Interview Invitation; `false` sends Polite Rejection. |
| `status` | `string` | Optional | `"shortlisted"` or `"not shortlisted"` | Legacy string fallback. |

### Final Shortlist Schema (`validation.js`)

Used by `sendFinalShortlistEmail(details)` and `prepareFinalShortlistEmail(details)`:

| Field | Type | Required | Validation Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | Non-empty string (trimmed) | Candidate full name. |
| `email` | `string` | **Yes** | RFC regex format | Destination email address. |
| `isShortlisted` | `boolean` | **Yes** | Strict boolean (`true` or `false`) | `true`: Final selection confirmation.<br/>`false`: Final application update. |
| `groupLink` | `string` | Optional | Optional string | WhatsApp community/group invite link (rendered only when `isShortlisted: true`). Ignored on rejection. |

---

## Deliverability Batch Testers

### Safety Features
- **Schema Validation**: Validates candidate objects against the respective schema before queuing.
- **Empty Email Detection**: Automatically skips entries with missing or blank emails.
- **Duplicate Prevention**: Normalizes email addresses (trimmed & lowercased) and skips duplicate recipients within the same execution.
- **Confirmation Gate**: Halts execution and requires explicit terminal input (`yes` or `y`) before dispatching any real emails.
- **Configurable Throttling**: Customizable `BATCH_SIZE`, `DELAY_BETWEEN_EMAILS_MS`, and `DELAY_BETWEEN_BATCHES_MS`.
- **Fault-Tolerant Loop**: Catches per-recipient SMTP errors and continues with the rest of the queue.
- **Standalone Execution**: Safe to import without side effects (`if (require.main === module)`).

### Initial Shortlist Tester (`batchTest.js`)

1. Open [`src/emailer/batchTest.js`](./batchTest.js) and populate `candidates`:
   ```javascript
   const candidates = [
     { name: "Test Candidate 1", email: "candidate1@example.com", shortlisted: true },
     { name: "Test Candidate 2", email: "candidate2@example.com", shortlisted: false }
   ];
   ```
2. Run from project root:
   ```bash
   node src/emailer/batchTest.js
   ```

### Final Shortlist Tester (`batchTestFinalShortlist.js`)

1. Open [`src/emailer/batchTestFinalShortlist.js`](./batchTestFinalShortlist.js) and populate `candidates`:
   ```javascript
   const candidates = [
     {
       name: "Test Candidate 1",
       email: "candidate1@example.com",
       isShortlisted: true,
       groupLink: "https://chat.whatsapp.com/example"
     },
     {
       name: "Test Candidate 2",
       email: "candidate2@example.com",
       isShortlisted: false
     }
   ];
   ```
2. Run from project root:
   ```bash
   node src/emailer/batchTestFinalShortlist.js
   ```
3. Type `yes` when prompted by the terminal confirmation.

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

This executes all 38 tests in [`src/emailer/emailer.test.js`](./emailer.test.js) without dispatching real network emails (using mocked transporters).
