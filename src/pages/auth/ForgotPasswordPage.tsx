import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { auth } from "@/lib/firebase";
import { getAuthErrorMessage } from "@/lib/authErrors";
import logo from "@/assets/logo.jpeg";

const apiBaseUrl =
  import.meta.env.VITE_MOYASAR_API_BASE_URL ||
  import.meta.env.VITE_PAYPAL_API_BASE_URL ||
  "";

const ForgotPasswordPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.dir() === "rtl";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(t("auth.resetEmailSent"));

      // Also send reset email via our backend (Resend). The server builds
      // the actual link itself — it will not accept one from us.
      try {
        await fetch(`${apiBaseUrl}/api/auth/send-reset-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name: email.split("@")[0],
          }),
        });
      } catch (resendError) {
        console.warn("Failed to send Resend reset email:", resendError);
        // Continue - Firebase email already sent
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, t));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="absolute end-4 top-4">
          <LanguageSwitcher />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-md"
        >
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <Link to="/">
              <img
                src={logo}
                alt="Link"
                className="h-16 w-16 rounded-xl object-cover"
              />
            </Link>
            <h1 className="mt-4 text-2xl font-bold text-foreground">
              {t("auth.resetPassword")}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t("auth.resetPasswordDescription")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="ps-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  {t("auth.sendResetLink")}
                  <ArrowIcon className="ms-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 flex items-center justify-between text-sm">
            <Button
              variant="ghost"
              className="px-0"
              onClick={() => navigate("/auth/login")}
            >
              {t("auth.backToLogin")}
            </Button>
            <Link to="/auth/signup" className="text-primary hover:underline">
              {t("auth.signup")}
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden flex-1 hero-gradient lg:flex lg:items-center lg:justify-center">
        <div className="p-12 text-center">
          <img
            src={logo}
            alt="Link"
            className="mx-auto h-40 w-40 rounded-3xl object-cover shadow-2xl float"
          />
          <h2 className="mt-8 text-3xl font-bold text-primary-foreground">
            {t("common.appName")}
          </h2>
          <p className="mt-4 max-w-md text-lg text-primary-foreground/80">
            {t("common.tagline")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
