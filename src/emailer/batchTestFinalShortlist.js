/**
 * ============================================================================
 * Recruitment Portal - Final Shortlist Deliverability Batch Tester
 * ============================================================================
 *
 * HOW TO RUN:
 *   1. Populate the `candidates` array below with your test recipient email(s).
 *   2. Ensure your `.env` contains valid credentials:
 *        EMAIL_USER=your.email@gmail.com
 *        EMAIL_APP_PASSWORD=your_16_char_app_password
 *   3. Run the script from the project root:
 *        node src/emailer/batchTestFinalShortlist.js
 *   4. Type "yes" when prompted to confirm real email delivery.
 *
 * HOW TO MANUALLY CHECK DELIVERABILITY:
 *   - Primary Inbox: Ideal destination; check sender name, subject, and layout.
 *   - Promotions Tab: Common destination for automated HTML templates;
 *     check here if not found in primary inbox.
 *   - Spam / Junk Folder: If filtered here, mark as "Not Spam" to train Gmail client filters.
 * ============================================================================
 */

// 1. EDITABLE CANDIDATES LIST
// Populate with real test email addresses before running
const candidates = [
  {
    name: "Test Candidate 1",
    email: "ark.maheshwari2025@vitstudent.ac.in", // Fill in manually (e.g., "rahul@vitstudent.ac.in")
    isShortlisted: true, // Sends Final Selection Confirmation template
    groupLink: "https://chat.whatsapp.com/example"
  },
  {
    name: "Test Candidate 2",
    email: "", // Fill in manually (e.g., "priya@vitstudent.ac.in")
    isShortlisted: false // Sends Final Application Update template
  }
];

// 2. CONFIGURABLE BATCHING & DELAY SETTINGS
const BATCH_SIZE = 2; // Number of emails per batch
const DELAY_BETWEEN_EMAILS_MS = 1500; // Delay between individual emails within a batch (ms)
const DELAY_BETWEEN_BATCHES_MS = 3000; // Delay between batches (ms)

// Load environment configuration
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const readline = require("readline");
const { sendFinalShortlistEmail, validateFinalShortlistDetails } = require("./index");

/**
 * Helper delay function.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Asks a question in the terminal and returns user response.
 * @param {string} query
 * @returns {Promise<string>}
 */
function askConfirmation(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Normalizes email address for duplicate checking.
 * @param {string} email
 * @returns {string}
 */
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Main batch testing execution function.
 */
async function runBatchTest() {
  console.log("\n==================================================");
  console.log("   Recruitment Emailer - Final Shortlist Batch Test");
  console.log("==================================================\n");

  const senderAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || "(not configured)";
  const authUser = process.env.EMAIL_USER || "(none)";
  console.log(`Configured Sender:     ${senderAddress}`);
  console.log(`Authenticated Account: ${authUser}`);
  console.log(`Reply-To Address:      ${process.env.EMAIL_REPLY_TO || authUser}`);
  console.log(`Batch Size:            ${BATCH_SIZE}`);
  console.log(`Delay Between Sends:   ${DELAY_BETWEEN_EMAILS_MS}ms`);
  console.log(`Delay Between Batches: ${DELAY_BETWEEN_BATCHES_MS}ms`);
  console.log(`Total Candidates:      ${candidates.length}\n`);

  // Deliverability Health Check: Verify sender matches authenticated account
  if (process.env.EMAIL_FROM && process.env.EMAIL_USER) {
    const fromMatch = process.env.EMAIL_FROM.match(/<([^>]+)>/);
    const fromEmail = fromMatch ? fromMatch[1].trim().toLowerCase() : process.env.EMAIL_FROM.trim().toLowerCase();
    const userEmail = process.env.EMAIL_USER.trim().toLowerCase();

    if (fromEmail !== userEmail) {
      console.log("⚠️  DELIVERABILITY WARNING: SENDER MISMATCH DETECTED!");
      console.log(`   From Address:          ${fromEmail}`);
      console.log(`   Authenticated Account: ${userEmail}`);
      console.log("   Gmail flags emails as phishing/spam when the 'From' header email doesn't match the authenticated user.\n");
    }
  }

  // Analyze candidates for empty emails, validation errors, and duplicates
  const seenEmails = new Set();
  const queueToProcess = [];
  const skippedEntries = [];

  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index];
    const candidateName = candidate?.name || `Candidate #${index + 1}`;
    const rawEmail = candidate?.email;

    // Check for missing or empty email
    if (!rawEmail || typeof rawEmail !== "string" || rawEmail.trim() === "") {
      const reason = "Email field is empty";
      console.log(`[SKIP] ${candidateName}: ${reason}`);
      skippedEntries.push({
        name: candidateName,
        email: "(empty)",
        template: candidate?.isShortlisted ? "Final Selection" : "Final Application Update",
        reason
      });
      continue;
    }

    // Validate candidate payload against module schema
    const validation = validateFinalShortlistDetails(candidate);
    if (!validation.isValid) {
      const reason = validation.error;
      console.log(`[SKIP] ${candidateName}: ${reason}`);
      skippedEntries.push({
        name: candidateName,
        email: rawEmail.trim(),
        template: candidate?.isShortlisted ? "Final Selection" : "Final Application Update",
        reason
      });
      continue;
    }

    const normalized = normalizeEmail(rawEmail);

    // Check for accidental duplicate within the same run
    if (seenEmails.has(normalized)) {
      const reason = `Duplicate recipient (${normalized})`;
      console.log(`[SKIP] ${candidateName} <${normalized}>: ${reason}`);
      skippedEntries.push({
        name: candidateName,
        email: rawEmail.trim(),
        template: candidate?.isShortlisted ? "Final Selection" : "Final Application Update",
        reason
      });
      continue;
    }

    seenEmails.add(normalized);
    queueToProcess.push({
      ...candidate,
      email: rawEmail.trim(),
      normalizedEmail: normalized
    });
  }

  // If no candidates to send
  if (queueToProcess.length === 0) {
    console.log("\n⚠️  No valid candidates to send emails to.");
    console.log("Please populate the `candidates` array at the top of src/emailer/batchTestFinalShortlist.js.\n");
    printSummary({ successfulSends: [], failedSends: [], skippedEntries });
    return;
  }

  // Display queue preview
  console.log("\n--------------------------------------------------");
  console.log(`Ready to process ${queueToProcess.length} email(s):`);
  queueToProcess.forEach((item, idx) => {
    const templateType = item.isShortlisted ? "Final Selection" : "Final Application Update";
    console.log(`  ${idx + 1}. ${item.name} <${item.email}> [Template: ${templateType}]`);
  });
  console.log("--------------------------------------------------\n");

  // Require explicit confirmation before sending real emails
  console.log("⚠️  CONFIRMATION REQUIRED: This action will send REAL emails.");
  const answer = await askConfirmation('Type "yes" or "y" to confirm and begin sending: ');

  if (answer.toLowerCase() !== "yes" && answer.toLowerCase() !== "y") {
    console.log("\n❌ Batch test aborted by user. No emails were sent.\n");
    return;
  }

  console.log("\n🚀 Starting batch delivery...\n");

  const successfulSends = [];
  const failedSends = [];

  // Chunk candidates into batches
  const batches = [];
  for (let i = 0; i < queueToProcess.length; i += BATCH_SIZE) {
    batches.push(queueToProcess.slice(i, i + BATCH_SIZE));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const currentBatch = batches[batchIndex];
    console.log(`--- Processing Batch ${batchIndex + 1} of ${batches.length} (${currentBatch.length} recipient${currentBatch.length > 1 ? "s" : ""}) ---`);

    for (let itemIndex = 0; itemIndex < currentBatch.length; itemIndex++) {
      const candidate = currentBatch[itemIndex];
      const templateType = candidate.isShortlisted ? "Final Selection" : "Final Application Update";

      console.log(`\nCandidate:     ${candidate.name}`);
      console.log(`Recipient:     ${candidate.email}`);
      console.log(`Template Type: ${templateType}`);

      try {
        const result = await sendFinalShortlistEmail({
          name: candidate.name,
          email: candidate.email,
          isShortlisted: candidate.isShortlisted,
          groupLink: candidate.groupLink
        });

        console.log(`Status:        SUCCESS ✅`);
        console.log(`Message ID:    ${result.messageId}`);

        successfulSends.push({
          name: candidate.name,
          email: candidate.email,
          template: templateType,
          messageId: result.messageId
        });
      } catch (error) {
        console.error(`Status:        FAILED ❌`);
        console.error(`Error Details: ${error.message}`);

        // Do not retry, continue with next candidate
        failedSends.push({
          name: candidate.name,
          email: candidate.email,
          template: templateType,
          error: error.message
        });
      }

      // Delay between emails within the same batch
      const isLastInBatch = itemIndex === currentBatch.length - 1;
      if (!isLastInBatch && DELAY_BETWEEN_EMAILS_MS > 0) {
        await sleep(DELAY_BETWEEN_EMAILS_MS);
      }
    }

    // Delay between consecutive batches
    const isLastBatch = batchIndex === batches.length - 1;
    if (!isLastBatch && DELAY_BETWEEN_BATCHES_MS > 0) {
      console.log(`\nPausing for ${DELAY_BETWEEN_BATCHES_MS}ms before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  printSummary({ successfulSends, failedSends, skippedEntries });
}

/**
 * Prints the final execution summary.
 * @param {Object} results
 * @param {Array} results.successfulSends
 * @param {Array} results.failedSends
 * @param {Array} results.skippedEntries
 */
function printSummary({ successfulSends, failedSends, skippedEntries }) {
  console.log("\n==================================================");
  console.log("       FINAL SHORTLIST BATCH TEST SUMMARY");
  console.log("==================================================");
  console.log(`Total Candidates Defined:  ${candidates.length}`);
  console.log(`Successful Sends:          ${successfulSends.length} ✅`);
  console.log(`Failed Sends:              ${failedSends.length} ❌`);
  console.log(`Skipped Entries:           ${skippedEntries.length} ⏭️`);
  console.log("==================================================");

  if (successfulSends.length > 0) {
    console.log("\nSuccessful Deliveries:");
    successfulSends.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.name} (${item.email}) - Template: ${item.template} | Message ID: ${item.messageId}`);
    });
  }

  if (failedSends.length > 0) {
    console.log("\nFailed Deliveries (not retried):");
    failedSends.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.name} (${item.email}) - Template: ${item.template} | Error: ${item.error}`);
    });
  }

  if (skippedEntries.length > 0) {
    console.log("\nSkipped Candidates:");
    skippedEntries.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.name} (${item.email}) - Reason: ${item.reason}`);
    });
  }

  console.log("\nDeliverability Inspection & Warm-up Actions:");
  console.log("  • Primary Inbox  : Check sender name display, subject, and clean formatting.");
  console.log("  • Promotions Tab : Check if Gmail placed the HTML announcement here.");
  console.log("  • Spam / Junk    : If any email landed in Spam, complete these steps once:");
  console.log("      1. Click 'Report not spam' (moves email to Primary Inbox).");
  console.log("      2. Hit 'Reply' from that recipient mailbox and send a short reply.");
  console.log("      3. Add the sender email to the recipient's Google Contacts.");
  console.log("==================================================\n");
}

// Execute batch test runner only if run directly from CLI
if (require.main === module) {
  runBatchTest().catch((err) => {
    console.error("Fatal error during batch test execution:", err);
    process.exit(1);
  });
}

module.exports = {
  candidates,
  BATCH_SIZE,
  DELAY_BETWEEN_EMAILS_MS,
  DELAY_BETWEEN_BATCHES_MS,
  normalizeEmail,
  runBatchTest
};

