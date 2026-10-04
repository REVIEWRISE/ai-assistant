/**
 * Shared email validation policy (RFC 5321 / RFC 5322 / RFC 1035).
 * Applied across all user entry points: registration, login, profile updates,
 * admin user management, password reset, and verification requests.
 */

export const EMAIL_MAX_LENGTH = 254;
export const EMAIL_LOCAL_MAX_LENGTH = 64;
export const EMAIL_DOMAIN_MAX_LENGTH = 253;

export type EmailPolicyViolation =
  | "missing"
  | "too_long"
  | "invalid_format"
  | "invalid_local"
  | "invalid_domain";

export interface EmailValidationResult {
  isValid: boolean;
  violation?: EmailPolicyViolation;
  message?: string;
}

// RFC 5322 compliant local part characters (unquoted):
// Allowed: a-zA-Z0-9 and !#$%&'*+-/=?^_`{|}~
// Dot-separated chunks: cannot start/end with dot, no consecutive dots.
const LOCAL_PART_RE = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;

// RFC 1035 domain label: 1-63 alphanumeric chars with internal hyphens
const DOMAIN_LABEL_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

// Top-Level Domain (TLD): min 2 alphabetic characters or internationalized domain punycode (xn--)
const TLD_RE = /^(?:[a-zA-Z]{2,63}|xn--[a-zA-Z0-9-]{2,59})$/;

/**
 * Validates email syntax against strict RFC standards.
 * Returns { isValid: true } if valid, or a detailed violation code and message.
 */
export function validateEmail(email: unknown): EmailValidationResult {
  if (typeof email !== "string") {
    return {
      isValid: false,
      violation: "missing",
      message: "Please enter an email address.",
    };
  }

  const trimmed = email.trim();
  if (!trimmed) {
    return {
      isValid: false,
      violation: "missing",
      message: "Please enter an email address.",
    };
  }

  if (trimmed.length > EMAIL_MAX_LENGTH) {
    return {
      isValid: false,
      violation: "too_long",
      message: `Email address must not exceed ${EMAIL_MAX_LENGTH} characters.`,
    };
  }

  // Exactly one '@' symbol
  const atIndex = trimmed.indexOf("@");
  if (atIndex === -1 || atIndex !== trimmed.lastIndexOf("@")) {
    return {
      isValid: false,
      violation: "invalid_format",
      message: "Email address must contain a single '@' separator.",
    };
  }

  const localPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex + 1);

  if (!localPart || localPart.length > EMAIL_LOCAL_MAX_LENGTH) {
    return {
      isValid: false,
      violation: "invalid_local",
      message: `Email username must be between 1 and ${EMAIL_LOCAL_MAX_LENGTH} characters.`,
    };
  }

  if (!LOCAL_PART_RE.test(localPart)) {
    return {
      isValid: false,
      violation: "invalid_local",
      message: "Email username contains invalid characters or consecutive dots.",
    };
  }

  if (!domainPart || domainPart.length > EMAIL_DOMAIN_MAX_LENGTH) {
    return {
      isValid: false,
      violation: "invalid_domain",
      message: `Email domain must be between 1 and ${EMAIL_DOMAIN_MAX_LENGTH} characters.`,
    };
  }

  const labels = domainPart.split(".");
  if (labels.length < 2) {
    return {
      isValid: false,
      violation: "invalid_domain",
      message: "Email domain must include a valid top-level domain (e.g. .com).",
    };
  }

  for (const label of labels) {
    if (!DOMAIN_LABEL_RE.test(label)) {
      return {
        isValid: false,
        violation: "invalid_domain",
        message: "Email domain labels contain invalid characters or invalid hyphen placement.",
      };
    }
  }

  const tld = labels[labels.length - 1];
  if (!TLD_RE.test(tld)) {
    return {
      isValid: false,
      violation: "invalid_domain",
      message: "Email domain must end with a valid top-level domain (e.g. .com, .io).",
    };
  }

  return { isValid: true };
}

/**
 * Returns true if the email passes strict RFC syntax validation.
 */
export function isValidEmail(email: unknown): email is string {
  return validateEmail(email).isValid;
}

/**
 * Trims, converts to lowercase, and validates an email string.
 * Returns null if the email is invalid.
 */
export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const trimmed = email.trim();
  if (!isValidEmail(trimmed)) return null;
  return trimmed.toLowerCase();
}
