import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.jpeg";

const RESEND_COOLDOWN_SECONDS = 60;

const VerifyLoginOtpPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyLoginOtp, resendLoginOtp } = useAuth();

  const pending = location.state as { uid?: string; email?: string } | null;

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pending?.uid) {
      navigate("/auth/login", { replace: true });
    }
  }, [pending, navigate]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!pending?.uid) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError(t("auth.otp.invalidLength"));
      return;
    }
    setError("");
    setIsVerifying(true);
    try {
      await verifyLoginOtp(pending.uid as string, code.trim());
      navigate("/");
    } catch (err) {
      const message = (err as { message?: string })?.message;
      setError(message || t("common.error"));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setError("");
    setIsResending(true);
    try {
      await resendLoginOtp(pending.uid as string);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setCode("");
    } catch (err) {
      const message = (err as { message?: string })?.message;
      setError(message || t("common.error"));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="absolute start-4 top-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate("/auth/login", { replace: true })}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t("common.back")}
          </Button>
        </div>
        <div className="absolute end-4 top-4">
          <LanguageSwitcher />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-md"
        >
          <div className="mb-8 flex flex-col items-center">
            <img
              src={logo}
              alt="Link"
              className="h-16 w-16 rounded-xl object-cover"
            />
            <ShieldCheck className="mt-4 h-8 w-8 text-primary" />
            <h1 className="mt-2 text-2xl font-bold text-foreground">
              {t("auth.otp.title")}
            </h1>
            <p className="mt-2 text-center text-muted-foreground">
              {t("auth.otp.subtitle", { email: pending.email })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="otp-code">{t("auth.otp.codeLabel")}</Label>
              <Input
                ref={inputRef}
                id="otp-code"
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
                className="text-center text-2xl tracking-[0.5em]"
              />
              <p className="text-xs text-muted-foreground">
                {t("auth.otp.expiryNote")}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isVerifying || code.length !== 6}
            >
              {isVerifying ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                t("auth.otp.verify")
              )}
            </Button>

            <div className="text-center text-sm">
              {cooldown > 0 ? (
                <span className="text-muted-foreground">
                  {t("auth.otp.resendIn", { seconds: cooldown })}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="font-medium text-primary hover:underline disabled:opacity-50"
                >
                  {isResending ? t("common.loading") : t("auth.otp.resend")}
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>

      <div className="hidden flex-1 hero-gradient lg:flex lg:items-center lg:justify-center">
        <div className="p-12 text-center">
          <ShieldCheck className="mx-auto h-32 w-32 text-primary-foreground" />
          <h2 className="mt-8 text-3xl font-bold text-primary-foreground">
            {t("auth.otp.title")}
          </h2>
          <p className="mt-4 max-w-md text-lg text-primary-foreground/80">
            {t("auth.otp.heroSubtitle")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyLoginOtpPage;
