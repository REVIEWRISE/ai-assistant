/**
 * Shared password strength policy (SOC 2 CC6.1) — applied everywhere a password
 * is set: signup, admin-created accounts, and self-service password change.
 */

export const PASSWORD_MIN_LENGTH = 12;

export type PasswordPolicyContext = {
  email?: string | null;
  fullName?: string | null;
};

export type PasswordPolicyViolation = "weak_password" | "weak_password_personal";

/**
 * Returns null if `password` satisfies the policy, otherwise the reason code
 * to redirect with (see register/page.tsx, profile-toasts.tsx, users-toasts.tsx
 * for the corresponding user-facing messages).
 */
export function validatePasswordStrength(
  password: string,
  context: PasswordPolicyContext = {},
): PasswordPolicyViolation | null {
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^a-zA-Z0-9]/.test(password)
  ) {
    return "weak_password";
  }

  const lowerPassword = password.toLowerCase();

  const emailLocalPart = context.email?.trim().toLowerCase().split("@")[0];
  if (emailLocalPart && emailLocalPart.length >= 4 && lowerPassword.includes(emailLocalPart)) {
    return "weak_password_personal";
  }

  const nameParts =
    context.fullName
      ?.trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((part) => part.length >= 4) ?? [];
  if (nameParts.some((part) => lowerPassword.includes(part))) {
    return "weak_password_personal";
  }

  return null;
}
