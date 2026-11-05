const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");

const {
    sendShortlistEmail,
    prepareEmail,
    validateApplicant,
    isValidApplicant,
    setTransporter,
    resetTransporter
} = require("./index");

describe("src/emailer Module Test Suite", () => {
    let mockSentEmails = [];
    let mockTransporter;

    beforeEach(() => {
        mockSentEmails = [];

        // Mock transporter: intercepts sendMail without contacting any remote server
        mockTransporter = {
            sendMail: async (mailOptions) => {
                mockSentEmails.push(mailOptions);
                return {
                    messageId: `<mock-${Date.now()}@recruitment-test.internal>`,
                    response: "250 Message accepted"
                };
            }
        };

        setTransporter(mockTransporter);
    });

    afterEach(() => {
        resetTransporter();
    });

    // ==========================================
    // 1. Validation Logic
    // ==========================================
    describe("Validation Logic (validation.js)", () => {
        it("should accept valid shortlisted applicant with boolean true", () => {
            const input = {
                name: "Rahul Sharma",
                email: "rahul@example.com",
                shortlisted: true
            };
            const result = validateApplicant(input);
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(isValidApplicant(input), true);
        });

        it("should accept valid rejected applicant with boolean false", () => {
            const input = {
                name: "Priya Patel",
                email: "priya@example.com",
                shortlisted: false
            };
            const result = validateApplicant(input);
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(isValidApplicant(input), true);
        });

        it("should accept legacy status for backwards compatibility", () => {
            const inputShortlisted = {
                name: "Ankit",
                email: "ankit@example.com",
                status: "shortlisted"
            };
            const inputRejected = {
                name: "Sneha",
                email: "sneha@example.com",
                status: "not shortlisted"
            };
            assert.strictEqual(validateApplicant(inputShortlisted).isValid, true);
            assert.strictEqual(validateApplicant(inputRejected).isValid, true);
        });

        it("should reject when shortlisted is not a boolean (e.g. string 'true')", () => {
            const input = {
                name: "Rahul Sharma",
                email: "rahul@example.com",
                shortlisted: "true"
            };
            const result = validateApplicant(input);
            assert.strictEqual(result.isValid, false);
            assert.match(result.error, /boolean/i);
        });

        it("should reject when shortlisted field is missing", () => {
            const input = {
                name: "Rahul Sharma",
                email: "rahul@example.com"
            };
            const result = validateApplicant(input);
            assert.strictEqual(result.isValid, false);
            assert.match(result.error, /shortlisted/i);
        });

        it("should reject missing or empty name", () => {
            const emptyName = { name: "   ", email: "rahul@example.com", shortlisted: true };
            const missingName = { email: "rahul@example.com", shortlisted: true };
            const nonStringName = { name: 12345, email: "rahul@example.com", shortlisted: true };

            assert.strictEqual(validateApplicant(emptyName).isValid, false);
            assert.strictEqual(validateApplicant(missingName).isValid, false);
            assert.strictEqual(validateApplicant(nonStringName).isValid, false);
        });

        it("should reject invalid email format", () => {
            const badEmails = [
                { name: "Rahul", email: "not-an-email", shortlisted: true },
                { name: "Rahul", email: "rahul@", shortlisted: true },
                { name: "Rahul", email: "@example.com", shortlisted: true },
                { name: "Rahul", email: "", shortlisted: true }
            ];

            for (const input of badEmails) {
                const res = validateApplicant(input);
                assert.strictEqual(res.isValid, false, `Expected ${input.email} to fail validation`);
                assert.match(res.error, /email/i);
            }
        });

        it("should reject non-object or array inputs", () => {
            assert.strictEqual(validateApplicant(null).isValid, false);
            assert.strictEqual(validateApplicant(undefined).isValid, false);
            assert.strictEqual(validateApplicant([]).isValid, false);
            assert.strictEqual(validateApplicant("string input").isValid, false);
        });
    });

    // ==========================================
    // 2. Email Template Preparation
    // ==========================================
    describe("Template Preparation (prepareEmail)", () => {
        it("should generate professional shortlisting email with interview slot details", () => {
            const applicant = {
                name: "Rahul Sharma",
                email: "rahul@example.com",
                shortlisted: true
            };

            const email = prepareEmail(applicant);
            assert.ok(email);
            assert.strictEqual(email.to, "rahul@example.com");
            assert.strictEqual(email.shortlisted, true);
            assert.match(email.subject, /shortlisted/i);
            assert.match(email.message, /Rahul Sharma/);
            assert.match(email.message, /interview slot/i);
            assert.match(email.html, /Rahul Sharma/);
            assert.match(email.html, /YOU'VE MADE/);
            assert.match(email.html, /cid:tam-club-logo/);
            assert.ok(Array.isArray(email.attachments));
            assert.strictEqual(email.attachments[0].cid, "tam-club-logo");
        });

        it("should generate polite rejection email with encouraging message", () => {
            const applicant = {
                name: "Priya Patel",
                email: "priya@example.com",
                shortlisted: false
            };

            const email = prepareEmail(applicant);
            assert.ok(email);
            assert.strictEqual(email.to, "priya@example.com");
            assert.strictEqual(email.shortlisted, false);
            assert.match(email.subject, /Application Update/i);
            assert.match(email.message, /Priya Patel/);
            assert.match(email.message, /future/i);
            assert.match(email.html, /Priya Patel/);
            assert.match(email.html, /EVERY STORY/);
            assert.match(email.html, /cid:tam-club-logo/);
        });

        it("should return null if status or shortlisted flag is not recognized", () => {
            assert.strictEqual(prepareEmail({ name: "Rahul", email: "rahul@example.com" }), null);
            assert.strictEqual(prepareEmail({ name: "Rahul", email: "rahul@example.com", status: "unknown" }), null);
        });
    });

    // ==========================================
    // 3. Public API: sendShortlistEmail
    // ==========================================
    describe("Public API (sendShortlistEmail)", () => {
        it("should successfully send interview shortlisting email for shortlisted: true", async () => {
            const applicant = {
                name: "Rahul Sharma",
                email: "rahul@example.com",
                shortlisted: true
            };

            const result = await sendShortlistEmail(applicant);
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.recipient, "rahul@example.com");
            assert.strictEqual(result.shortlisted, true);
            assert.ok(result.messageId);

            // Assert mock transporter captured the email
            assert.strictEqual(mockSentEmails.length, 1);
            assert.strictEqual(mockSentEmails[0].to, "rahul@example.com");
            assert.match(mockSentEmails[0].subject, /shortlisted/i);
            assert.match(mockSentEmails[0].text, /interview slot/i);
            assert.ok(mockSentEmails[0].attachments);
            assert.strictEqual(mockSentEmails[0].attachments[0].cid, "tam-club-logo");
        });

        it("should successfully send polite rejection email for shortlisted: false", async () => {
            const applicant = {
                name: "Priya Patel",
                email: "priya@example.com",
                shortlisted: false
            };

            const result = await sendShortlistEmail(applicant);
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.recipient, "priya@example.com");
            assert.strictEqual(result.shortlisted, false);
            assert.ok(result.messageId);

            // Assert mock transporter captured the rejection email
            assert.strictEqual(mockSentEmails.length, 1);
            assert.strictEqual(mockSentEmails[0].to, "priya@example.com");
            assert.match(mockSentEmails[0].subject, /Application Update/i);
            assert.match(mockSentEmails[0].text, /not.*moving forward/i);
        });

        it("should throw validation error when shortlisted is not boolean", async () => {
            const applicant = {
                name: "Rahul Sharma",
                email: "rahul@example.com",
                shortlisted: "true"
            };

            await assert.rejects(
                async () => {
                    await sendShortlistEmail(applicant);
                },
                /Field 'shortlisted' must be a boolean/
            );

            // Verify no email was dispatched
            assert.strictEqual(mockSentEmails.length, 0);
        });

        it("should throw validation error when name or email is missing", async () => {
            await assert.rejects(
                async () => {
                    await sendShortlistEmail({ email: "rahul@example.com", shortlisted: true });
                },
                /Field 'name' is required/
            );

            await assert.rejects(
                async () => {
                    await sendShortlistEmail({ name: "Rahul", email: "invalid", shortlisted: true });
                },
                /Field 'email' is required/
            );

            assert.strictEqual(mockSentEmails.length, 0);
        });

        it("should throw when transporter fails (e.g. SMTP error)", async () => {
            setTransporter({
                sendMail: async () => {
                    throw new Error("SMTP connection lost");
                }
            });

            const applicant = {
                name: "Rahul Sharma",
                email: "rahul@example.com",
                shortlisted: true
            };

            await assert.rejects(
                async () => {
                    await sendShortlistEmail(applicant);
                },
                /SMTP connection lost/
            );
        });
    });
});
