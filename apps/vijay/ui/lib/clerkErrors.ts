export function getClerkErrorMessage(err: unknown): string {
  if (!err) return "An unexpected error occurred. Please try again.";

  // If err is a Clerk error object containing an errors array
  if (
    typeof err === "object" &&
    err !== null &&
    "errors" in err &&
    Array.isArray((err as { errors: unknown[] }).errors) &&
    (err as { errors: unknown[] }).errors.length > 0
  ) {
    const firstError = (err as { errors: Array<{ code?: string; message?: string; longMessage?: string }> }).errors[0];
    const code = firstError.code || "";
    const message = firstError.message || firstError.longMessage || "";

    switch (code) {
      case "form_identifier_not_found":
        return "We couldn't find an account with that email address.";
      case "form_password_incorrect":
        return "The password you entered is incorrect. Please try again.";
      case "form_identifier_exists":
        return "An account with this email address already exists.";
      case "form_password_pwned":
      case "form_password_length_too_short":
        return "Please choose a stronger password (at least 8 characters).";
      case "form_email_code_incorrect":
        return "Invalid verification code. Please check your email and try again.";
      case "form_code_expired":
        return "Verification code has expired. Please request a new code.";
      case "strategy_not_supported":
        return "This authentication method is not supported.";
      default:
        if (message) return message;
    }
  }

  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === "string") {
    return err;
  }

  return "Authentication failed. Please verify your credentials.";
}
