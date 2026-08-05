import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Sparkle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { useGuest } from "@/contexts/GuestContext";
import { getAuthErrorMessage } from "@/lib/authErrors";
import logo from "@/assets/logo.jpeg";

const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { enterGuestMode } = useGuest();
  const isRTL = i18n.dir() === "rtl";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isStrongPassword = (value: string) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isStrongPassword(password)) {
      setError(t("auth.passwordRequirements"));
      return;
    }

    setIsLoading(true);

    try {
      const pending = await login(email, password);
      // Password verified — a one-time code was just emailed. The login
      // isn't actually complete until it's confirmed on the next screen.
      navigate("/auth/verify-otp", { state: pending });
    } catch (err) {
      setError(getAuthErrorMessage(err, t));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowseAsGuest = () => {
    enterGuestMode();
    navigate("/client");
  };

  return (
    <div className="relative min-h-screen bg-background px-6 py-12">
      <div className="absolute start-4 top-4">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t("common.back")}
          </Button>
        </Link>
      </div>
      <div className="absolute end-4 top-4">
        <LanguageSwitcher />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex w-full max-w-md flex-col items-center pt-12"
      >
        {/* Logo */}
        <Link to="/">
          <img
            src={logo}
            alt="Link"
            className="h-24 w-24 rounded-[26px] object-cover shadow-xl sm:h-28 sm:w-28"
          />
        </Link>

        {/* Decorative divider */}
        <div className="mt-6 flex items-center gap-3">
          <span
            className="h-px w-16 sm:w-20"
            style={{
              background:
                "linear-gradient(to right, transparent, hsl(var(--primary) / 0.5))",
            }}
          />
          <Sparkle
            className="h-4 w-4 text-primary"
            fill="currentColor"
            strokeWidth={0}
          />
          <span
            className="h-px w-16 sm:w-20"
            style={{
              background:
                "linear-gradient(to left, transparent, hsl(var(--primary) / 0.5))",
            }}
          />
        </div>

        {/* Headline */}
        <h1 className="mt-6 text-center text-2xl font-bold leading-snug text-foreground sm:text-3xl">
          {t("auth.heroLine1")}
          <br />
          {t("auth.heroLine2")}{" "}
          <span className="text-primary">{t("auth.heroHighlight")}</span>
        </h1>
        <p className="mt-3 max-w-sm text-center text-sm text-muted-foreground sm:text-base">
          {t("auth.heroSubtitle")}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 w-full space-y-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
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

          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <div className="relative">
              <Lock className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="ps-10 pe-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("auth.passwordRequirements")}
          </p>

          <div className="text-end">
            <Link
              to="/auth/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              {t("auth.forgotPassword")}
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <>
                {t("auth.login")}
                <ArrowIcon className="ms-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="mt-8 flex w-full items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <p className="shrink-0 text-center text-sm text-muted-foreground">
            {t("auth.dontHaveAccount")}{" "}
            <Link
              to="/auth/signup"
              className="font-medium text-primary hover:underline"
            >
              {t("auth.signup")}
            </Link>
          </p>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Guest access */}
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full gap-2"
          onClick={handleBrowseAsGuest}
        >
          <User className="h-4 w-4" />
          {t("guest.browseAsGuest")}
        </Button>
      </motion.div>
    </div>
  );
};

export default LoginPage;
