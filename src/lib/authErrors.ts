// Firebase Auth error code mappings
// Maps Firebase error codes to translation keys or default messages

export const getAuthErrorMessage = (
  error: unknown,
  t: (key: string) => string,
): string => {
  const errorCode = (error as { code?: string })?.code || "";

  switch (errorCode) {
    // Sign up errors
    case "auth/email-already-in-use":
      return (
        t("auth.errors.emailInUse") ||
        "This email is already registered. Try logging in instead."
      );
    case "auth/invalid-email":
      return (
        t("auth.errors.invalidEmail") || "Please enter a valid email address."
      );
    case "auth/weak-password":
      return (
        t("auth.errors.weakPassword") ||
        "Password should be at least 6 characters."
      );
    case "auth/operation-not-allowed":
      return (
        t("auth.errors.operationNotAllowed") ||
        "Email/password sign up is not enabled."
      );

    // Login errors
    case "auth/user-not-found":
      return (
        t("auth.errors.userNotFound") || "No account found with this email."
      );
    case "auth/wrong-password":
      return (
        t("auth.errors.wrongPassword") ||
        "Incorrect password. Please try again."
      );
    case "auth/invalid-credential":
      return t("auth.errors.invalidCredential") || "Invalid email or password.";
    case "auth/user-disabled":
      return t("auth.errors.userDisabled") || "This account has been disabled.";
    case "auth/too-many-requests":
      return (
        t("auth.errors.tooManyRequests") ||
        "Too many failed attempts. Please try again later."
      );
    case "auth/email-not-verified":
      return (
        t("auth.errors.emailNotVerified") ||
        "Please verify your email before logging in."
      );
    case "auth/account-suspended":
      return (
        t("auth.errors.accountSuspended") ||
        "This account has been suspended. Contact support for help."
      );
    case "auth/account-inactive":
      return (
        t("auth.errors.accountInactive") ||
        "This account is inactive. Contact support to reactivate it."
      );

    // Phone errors
    case "auth/phone-already-in-use":
      return (
        t("auth.phoneAlreadyInUse") ||
        "This phone number is already registered."
      );

    // Network errors
    case "auth/network-request-failed":
      return (
        t("auth.errors.networkError") ||
        "Network error. Please check your connection."
      );

    // Default
    default:
      console.error("Unhandled auth error:", errorCode, error);
      return t("common.error") || "Something went wrong. Please try again.";
  }
};
