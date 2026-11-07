/**
 * Validates an applicant object for the shortlisting notification pipeline.
 *
 * Expected Schema:
 * {
 *   "name": "Candidate Name",
 *   "email": "jhon.doe2023@example.com",
 *   "shortlisted": true | false
 * }
 *
 * Also accepts legacy format:
 * {
 *   "name": "Candidate Name",
 *   "email": "jhon.doe2023@example.com",
 *   "status": "shortlisted" | "not shortlisted"
 * }
 *
 * @param {any} applicant
 * @returns {{ isValid: boolean, error?: string }}
 */
function validateApplicant(applicant) {
    if (!applicant || typeof applicant !== "object" || Array.isArray(applicant)) {
        return {
            isValid: false,
            error: "Applicant data must be a non-null JSON object."
        };
    }

    // Name validation
    if (typeof applicant.name !== "string" || applicant.name.trim() === "") {
        return {
            isValid: false,
            error: "Field 'name' is required and must be a non-empty string."
        };
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof applicant.email !== "string" || !emailRegex.test(applicant.email.trim())) {
        return {
            isValid: false,
            error: "Field 'email' is required and must be a valid email address."
        };
    }

    // Shortlisted status validation (explicitly check for boolean)
    const hasBooleanShortlisted = typeof applicant.shortlisted === "boolean";
    const hasLegacyStatus = applicant.status === "shortlisted" || applicant.status === "not shortlisted";

    if (!hasBooleanShortlisted && !hasLegacyStatus) {
        if (applicant.shortlisted !== undefined && typeof applicant.shortlisted !== "boolean") {
            return {
                isValid: false,
                error: "Field 'shortlisted' must be a boolean (true or false)."
            };
        }
        return {
            isValid: false,
            error: "Field 'shortlisted' is required and must be a boolean (true or false)."
        };
    }

    return {
        isValid: true
    };
}

/**
 * Backwards-compatible boolean helper.
 * @param {any} applicant
 * @returns {boolean}
 */
function isValidApplicant(applicant) {
    return validateApplicant(applicant).isValid;
}

/**
 * Validates candidate details for the final interview outcome notification.
 *
 * Expected Schema:
 * {
 *   "name": "Candidate Name",
 *   "email": "candidate@vitstudent.ac.in",
 *   "isShortlisted": true | false,
 *   "groupLink"?: "https://chat.whatsapp.com/example"
 * }
 *
 * @param {any} details
 * @returns {{ isValid: boolean, error?: string }}
 */
function validateFinalShortlistDetails(details) {
    if (!details || typeof details !== "object" || Array.isArray(details)) {
        return {
            isValid: false,
            error: "Candidate details must be a non-null JSON object."
        };
    }

    // Name validation
    if (typeof details.name !== "string" || details.name.trim() === "") {
        return {
            isValid: false,
            error: "Field 'name' is required and must be a non-empty string."
        };
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof details.email !== "string" || !emailRegex.test(details.email.trim())) {
        return {
            isValid: false,
            error: "Field 'email' is required and must be a valid email address."
        };
    }

    // isShortlisted status validation (strictly boolean true or false)
    if (typeof details.isShortlisted !== "boolean") {
        return {
            isValid: false,
            error: "Field 'isShortlisted' is required and must be a boolean (true or false)."
        };
    }

    return {
        isValid: true
    };
}

/**
 * Boolean helper for final shortlist validation.
 * @param {any} details
 * @returns {boolean}
 */
function isValidFinalShortlistDetails(details) {
    return validateFinalShortlistDetails(details).isValid;
}

module.exports = {
    validateApplicant,
    isValidApplicant,
    validateFinalShortlistDetails,
    isValidFinalShortlistDetails
};
