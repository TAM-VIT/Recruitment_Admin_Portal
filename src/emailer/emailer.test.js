const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");

const {
    sendShortlistEmail,
    prepareEmail,
    validateApplicant,
    isValidApplicant,
    sendFinalShortlistEmail,
    prepareFinalShortlistEmail,
    validateFinalShortlistDetails,
    isValidFinalShortlistDetails,
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

    // ==========================================
    // 4. Validation Logic - Final Shortlist
    // ==========================================
    describe("Validation Logic - Final Shortlist (validateFinalShortlistDetails)", () => {
        it("should accept valid shortlisted candidate with boolean true", () => {
            const input = {
                name: "Rahul Sharma",
                email: "rahul@vitstudent.ac.in",
                isShortlisted: true
            };
            const result = validateFinalShortlistDetails(input);
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(isValidFinalShortlistDetails(input), true);
        });

        it("should accept valid not-shortlisted candidate with boolean false", () => {
            const input = {
                name: "Priya Patel",
                email: "priya@vitstudent.ac.in",
                isShortlisted: false
            };
            const result = validateFinalShortlistDetails(input);
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(isValidFinalShortlistDetails(input), true);
        });

        it("should reject missing or empty name", () => {
            const emptyName = { name: "   ", email: "rahul@vitstudent.ac.in", isShortlisted: true };
            const missingName = { email: "rahul@vitstudent.ac.in", isShortlisted: true };
            const nonStringName = { name: 12345, email: "rahul@vitstudent.ac.in", isShortlisted: true };

            assert.strictEqual(validateFinalShortlistDetails(emptyName).isValid, false);
            assert.strictEqual(validateFinalShortlistDetails(missingName).isValid, false);
            assert.strictEqual(validateFinalShortlistDetails(nonStringName).isValid, false);
            assert.match(validateFinalShortlistDetails(emptyName).error, /name/i);
        });

        it("should reject missing email", () => {
            const missingEmail = { name: "Rahul Sharma", isShortlisted: true };
            const result = validateFinalShortlistDetails(missingEmail);
            assert.strictEqual(result.isValid, false);
            assert.match(result.error, /email/i);
        });

        it("should reject invalid email format", () => {
            const badEmails = [
                { name: "Rahul", email: "not-an-email", isShortlisted: true },
                { name: "Rahul", email: "rahul@", isShortlisted: true },
                { name: "Rahul", email: "@vitstudent.ac.in", isShortlisted: true },
                { name: "Rahul", email: "", isShortlisted: true },
                { name: "Rahul", email: 12345, isShortlisted: true }
            ];

            for (const input of badEmails) {
                const res = validateFinalShortlistDetails(input);
                assert.strictEqual(res.isValid, false, `Expected ${input.email} to fail validation`);
                assert.match(res.error, /email/i);
            }
        });

        it("should reject when isShortlisted is missing", () => {
            const input = {
                name: "Rahul Sharma",
                email: "rahul@vitstudent.ac.in"
            };
            const result = validateFinalShortlistDetails(input);
            assert.strictEqual(result.isValid, false);
            assert.match(result.error, /isShortlisted/i);
        });

        it("should reject non-boolean isShortlisted values (strings, numbers, objects)", () => {
            const invalidValues = ["true", "false", "1", "0", 1, 0, null, undefined, {}, []];

            for (const val of invalidValues) {
                const input = {
                    name: "Rahul Sharma",
                    email: "rahul@vitstudent.ac.in",
                    isShortlisted: val
                };
                const result = validateFinalShortlistDetails(input);
                assert.strictEqual(
                    result.isValid,
                    false,
                    `Expected isShortlisted=${JSON.stringify(val)} to fail validation`
                );
                assert.match(result.error, /isShortlisted.*boolean/i);
            }
        });

        it("should reject non-object or array inputs", () => {
            assert.strictEqual(validateFinalShortlistDetails(null).isValid, false);
            assert.strictEqual(validateFinalShortlistDetails(undefined).isValid, false);
            assert.strictEqual(validateFinalShortlistDetails([]).isValid, false);
            assert.strictEqual(validateFinalShortlistDetails("not-an-object").isValid, false);
        });
    });

    // ==========================================
    // 5. Final Shortlist Template Preparation
    // ==========================================
    describe("Template Preparation - Final Shortlist (prepareFinalShortlistEmail)", () => {
        it("should generate final selection confirmation email with correct subject, text, HTML, and branding", () => {
            const candidate = {
                name: "Rahul Sharma",
                email: "rahul@vitstudent.ac.in",
                isShortlisted: true
            };

            const email = prepareFinalShortlistEmail(candidate);
            assert.ok(email);
            assert.strictEqual(email.to, "rahul@vitstudent.ac.in");
            assert.strictEqual(email.isShortlisted, true);
            assert.strictEqual(email.shortlisted, true);
            assert.strictEqual(email.subject, "TAM Recruitment – Final Selection Confirmation");

            // Plain-text checks
            assert.match(email.message, /Dear Rahul Sharma,/);
            assert.match(email.message, /Congratulations!/);
            assert.match(email.message, /selected to join The AI & ML Club \(TAM\), VIT Vellore/);
            assert.match(email.message, /look forward to having you as part of the team/);
            assert.match(email.message, /Team TAM/);

            // HTML checks
            assert.match(email.html, /Rahul Sharma/);
            assert.match(email.html, /FINAL SELECTION CONFIRMATION/);
            assert.match(email.html, /The AI &amp; ML Club \(TAM\), VIT Vellore/);
            assert.match(email.html, /cid:tam-club-logo/);

            // Logo attachment check
            assert.ok(Array.isArray(email.attachments));
            assert.strictEqual(email.attachments[0].cid, "tam-club-logo");
        });

        it("should generate final application update email with correct subject, polite rejection, and wishes", () => {
            const candidate = {
                name: "Priya Patel",
                email: "priya@vitstudent.ac.in",
                isShortlisted: false
            };

            const email = prepareFinalShortlistEmail(candidate);
            assert.ok(email);
            assert.strictEqual(email.to, "priya@vitstudent.ac.in");
            assert.strictEqual(email.isShortlisted, false);
            assert.strictEqual(email.shortlisted, false);
            assert.strictEqual(email.subject, "TAM Recruitment – Final Application Update");

            // Plain-text checks
            assert.match(email.message, /Dear Priya Patel,/);
            assert.match(email.message, /Thank you for participating in the TAM recruitment process\./);
            assert.match(email.message, /won't be moving forward with your application this time/);
            assert.match(email.message, /wish you the very best/);
            assert.match(email.message, /Team TAM/);

            // HTML checks
            assert.match(email.html, /Priya Patel/);
            assert.match(email.html, /APPLICATION UPDATE/);
            assert.match(email.html, /participating in the TAM recruitment process/);
            assert.match(email.html, /cid:tam-club-logo/);
            assert.ok(Array.isArray(email.attachments));
            assert.strictEqual(email.attachments[0].cid, "tam-club-logo");
        });

        it("should properly escape user-supplied HTML in candidate name", () => {
            const candidate = {
                name: "<script>alert('XSS')</script> & Test",
                email: "test@vitstudent.ac.in",
                isShortlisted: true
            };

            const email = prepareFinalShortlistEmail(candidate);
            assert.ok(email);
            assert.ok(!email.html.includes("<script>alert('XSS')</script>"));
            assert.ok(email.html.includes("&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt; &amp; Test"));
            // In plain text, literal characters should be preserved
            assert.match(email.message, /<script>alert\('XSS'\)<\/script> & Test/);
        });

        it("should return null if details fail validation", () => {
            assert.strictEqual(prepareFinalShortlistEmail(null), null);
            assert.strictEqual(prepareFinalShortlistEmail({ name: "Rahul", email: "rahul@vitstudent.ac.in" }), null);
            assert.strictEqual(prepareFinalShortlistEmail({ name: "", email: "rahul@vitstudent.ac.in", isShortlisted: true }), null);
            assert.strictEqual(prepareFinalShortlistEmail({ name: "Rahul", email: "invalid", isShortlisted: true }), null);
            assert.strictEqual(prepareFinalShortlistEmail({ name: "Rahul", email: "rahul@vitstudent.ac.in", isShortlisted: "true" }), null);
        });

        it("should include supplied WhatsApp group link in HTML and plain text for shortlisted candidate", () => {
            const candidate = {
                name: "Rahul Sharma",
                email: "rahul@vitstudent.ac.in",
                isShortlisted: true,
                groupLink: "https://chat.whatsapp.com/example123"
            };

            const email = prepareFinalShortlistEmail(candidate);
            assert.ok(email);

            // Plain-text checks
            assert.match(email.message, /To stay connected with the team and receive further updates, please join our official WhatsApp group using the link below:/);
            assert.match(email.message, /https:\/\/chat\.whatsapp\.com\/example123/);

            // HTML checks
            assert.match(email.html, /To stay connected with the team and receive further updates, please join our official WhatsApp group using the link below\./);
            assert.match(email.html, /href="https:\/\/chat\.whatsapp\.com\/example123"/);
            assert.match(email.html, />\s*https:\/\/chat\.whatsapp\.com\/example123\s*<\/a>/);
        });

        it("should not create empty or broken hyperlink when groupLink is missing or whitespace", () => {
            const candidateOmitted = {
                name: "Rahul Sharma",
                email: "rahul@vitstudent.ac.in",
                isShortlisted: true
            };
            const candidateEmpty = {
                name: "Rahul Sharma",
                email: "rahul@vitstudent.ac.in",
                isShortlisted: true,
                groupLink: "   "
            };

            for (const cand of [candidateOmitted, candidateEmpty]) {
                const email = prepareFinalShortlistEmail(cand);
                assert.ok(email);
                assert.ok(!email.html.includes("<a href="));
                assert.ok(!email.html.includes("WHATSAPP"));
                assert.ok(!email.message.includes("WhatsApp"));
            }
        });

        it("should never include WhatsApp group link in rejection email even if groupLink is supplied", () => {
            const candidate = {
                name: "Priya Patel",
                email: "priya@vitstudent.ac.in",
                isShortlisted: false,
                groupLink: "https://chat.whatsapp.com/secret-group"
            };

            const email = prepareFinalShortlistEmail(candidate);
            assert.ok(email);
            assert.ok(!email.html.includes("https://chat.whatsapp.com/secret-group"));
            assert.ok(!email.html.includes("WhatsApp"));
            assert.ok(!email.message.includes("https://chat.whatsapp.com/secret-group"));
            assert.ok(!email.message.includes("WhatsApp"));
        });

        it("should properly escape HTML special characters in groupLink", () => {
            const candidate = {
                name: "Rahul Sharma",
                email: "rahul@vitstudent.ac.in",
                isShortlisted: true,
                groupLink: "https://chat.whatsapp.com/invite?id=123&track=tam\"'><script>alert(1)</script>"
            };

            const email = prepareFinalShortlistEmail(candidate);
            assert.ok(email);
            assert.ok(!email.html.includes("<script>alert(1)</script>"));
            assert.ok(email.html.includes("&amp;track=tam&quot;&#39;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"));
            // In plain text, literal link is preserved
            assert.match(email.message, /https:\/\/chat\.whatsapp\.com\/invite\?id=123&track=tam"'/);
        });
    });

    // ==========================================
    // 6. Public API: sendFinalShortlistEmail
    // ==========================================
    describe("Public API (sendFinalShortlistEmail)", () => {
        it("should successfully send final selection confirmation email for isShortlisted: true", async () => {
            const candidate = {
                name: "Rahul Sharma",
                email: "rahul@vitstudent.ac.in",
                isShortlisted: true,
                groupLink: "https://chat.whatsapp.com/test-link"
            };

            const result = await sendFinalShortlistEmail(candidate);
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.recipient, "rahul@vitstudent.ac.in");
            assert.strictEqual(result.isShortlisted, true);
            assert.ok(result.messageId);

            // Assert mock transporter captured email
            assert.strictEqual(mockSentEmails.length, 1);
            assert.strictEqual(mockSentEmails[0].to, "rahul@vitstudent.ac.in");
            assert.strictEqual(mockSentEmails[0].subject, "TAM Recruitment – Final Selection Confirmation");
            assert.match(mockSentEmails[0].text, /selected to join The AI & ML Club/i);
            assert.match(mockSentEmails[0].text, /https:\/\/chat\.whatsapp\.com\/test-link/);
            assert.match(mockSentEmails[0].html, /href="https:\/\/chat\.whatsapp\.com\/test-link"/);
            assert.ok(mockSentEmails[0].attachments);
            assert.strictEqual(mockSentEmails[0].attachments[0].cid, "tam-club-logo");
        });

        it("should successfully send final application update email for isShortlisted: false without groupLink even if provided", async () => {
            const candidate = {
                name: "Priya Patel",
                email: "priya@vitstudent.ac.in",
                isShortlisted: false,
                groupLink: "https://chat.whatsapp.com/should-not-be-sent"
            };

            const result = await sendFinalShortlistEmail(candidate);
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.recipient, "priya@vitstudent.ac.in");
            assert.strictEqual(result.isShortlisted, false);
            assert.ok(result.messageId);

            // Assert mock transporter captured rejection email
            assert.strictEqual(mockSentEmails.length, 1);
            assert.strictEqual(mockSentEmails[0].to, "priya@vitstudent.ac.in");
            assert.strictEqual(mockSentEmails[0].subject, "TAM Recruitment – Final Application Update");
            assert.match(mockSentEmails[0].text, /won't be moving forward/i);
            assert.ok(!mockSentEmails[0].text.includes("https://chat.whatsapp.com/should-not-be-sent"));
            assert.ok(!mockSentEmails[0].html.includes("https://chat.whatsapp.com/should-not-be-sent"));
            assert.ok(!mockSentEmails[0].text.includes("WhatsApp"));
            assert.ok(!mockSentEmails[0].html.includes("WhatsApp"));
        });

        it("should correctly select templates based on isShortlisted flag", async () => {
            await sendFinalShortlistEmail({
                name: "Candidate A",
                email: "a@example.com",
                isShortlisted: true
            });
            await sendFinalShortlistEmail({
                name: "Candidate B",
                email: "b@example.com",
                isShortlisted: false
            });

            assert.strictEqual(mockSentEmails.length, 2);
            assert.strictEqual(mockSentEmails[0].subject, "TAM Recruitment – Final Selection Confirmation");
            assert.strictEqual(mockSentEmails[1].subject, "TAM Recruitment – Final Application Update");
        });

        it("should throw validation error when isShortlisted is not a strict boolean", async () => {
            const candidate = {
                name: "Rahul Sharma",
                email: "rahul@vitstudent.ac.in",
                isShortlisted: "true"
            };

            await assert.rejects(
                async () => {
                    await sendFinalShortlistEmail(candidate);
                },
                /Field 'isShortlisted'.*must be a boolean/
            );

            // Verify no email was dispatched
            assert.strictEqual(mockSentEmails.length, 0);
        });

        it("should throw validation error when name or email is missing", async () => {
            await assert.rejects(
                async () => {
                    await sendFinalShortlistEmail({ email: "rahul@vitstudent.ac.in", isShortlisted: true });
                },
                /Field 'name' is required/
            );

            await assert.rejects(
                async () => {
                    await sendFinalShortlistEmail({ name: "Rahul", email: "invalid-email", isShortlisted: true });
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

            const candidate = {
                name: "Rahul Sharma",
                email: "rahul@vitstudent.ac.in",
                isShortlisted: true
            };

            await assert.rejects(
                async () => {
                    await sendFinalShortlistEmail(candidate);
                },
                /SMTP connection lost/
            );
        });
    });
});
