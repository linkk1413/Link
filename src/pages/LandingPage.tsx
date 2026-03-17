import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { useGuest } from "@/contexts/GuestContext";
import {
  ArrowRight,
  ArrowLeft,
  Shield,
  Calendar,
  MessageSquare,
  Star,
  Wallet,
  Users,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import logo from "@/assets/logo.jpeg";

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { enterGuestMode } = useGuest();
  const navigate = useNavigate();
  const isRTL = i18n.dir() === "rtl";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const handleBrowseAsGuest = () => {
    enterGuestMode();
    navigate("/client");
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const stagger = {
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const clientBenefits = [
    { icon: <Shield className="h-6 w-6" />, key: "clientBenefit1" },
    { icon: <Calendar className="h-6 w-6" />, key: "clientBenefit2" },
    { icon: <MessageSquare className="h-6 w-6" />, key: "clientBenefit3" },
  ];

  const providerBenefits = [
    { icon: <Users className="h-6 w-6" />, key: "providerBenefit1" },
    { icon: <Calendar className="h-6 w-6" />, key: "providerBenefit2" },
    { icon: <Wallet className="h-6 w-6" />, key: "providerBenefit3" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="Link"
              className="h-10 w-10 rounded-lg object-cover"
            />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1">
              <Moon className="h-4 w-4 text-muted-foreground" />
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) =>
                  setTheme(checked ? "dark" : "light")
                }
              />
            </div>
            <Link to="/auth/login">
              <Button variant="ghost" size="sm">
                {t("auth.login")}
              </Button>
            </Link>
            <Link to="/auth/signup">
              <Button size="sm">{t("auth.signup")}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen overflow-hidden hero-gradient">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -end-40 h-80 w-80 rounded-full bg-primary-foreground/10 blur-3xl" />
          <div className="absolute -bottom-40 -start-40 h-80 w-80 rounded-full bg-primary-foreground/10 blur-3xl" />
        </div>

        <div className="container relative flex min-h-screen flex-col items-center justify-center pt-20 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-3xl"
          >
            {/* Logo */}
            <motion.div
              variants={fadeInUp}
              className="mb-8 flex justify-center"
            >
              <div className="relative">
                <img
                  src={logo}
                  alt="Link"
                  className="h-28 w-28 rounded-2xl object-cover shadow-lg float"
                />
                <div className="absolute inset-0 rounded-2xl bg-primary-foreground/20 blur-xl" />
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeInUp}
              className="mb-6 text-4xl font-bold text-primary-foreground md:text-5xl lg:text-6xl"
            >
              {t("landing.heroTitle")}{" "}
              <span className="block">{t("landing.heroHighlight")}</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeInUp}
              className="mb-10 text-lg text-primary-foreground/90 md:text-xl"
            >
              {t("landing.heroSubtitle")}
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <Link to="/auth/signup">
                <Button
                  size="lg"
                  variant="secondary"
                  className="group min-w-48 text-lg"
                >
                  {t("landing.getStarted")}
                  <ArrowIcon className="ms-2 h-5 w-5 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="ghost"
                onClick={handleBrowseAsGuest}
                className="min-w-48 text-lg text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                {t("guest.browseAsGuest")}
              </Button>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8"
          >
            <div className="flex flex-col items-center gap-2 text-primary-foreground/60">
              <div className="h-8 w-5 rounded-full border-2 border-current">
                <motion.div
                  animate={{ y: [0, 12, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="mx-auto mt-1 h-2 w-1 rounded-full bg-current"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20">
        <div className="container">
          <div className="grid gap-12 md:grid-cols-2">
            {/* For Clients */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="rounded-2xl bg-card p-8 card-glow"
            >
              <motion.h2
                variants={fadeInUp}
                className="mb-6 text-2xl font-bold text-card-foreground"
              >
                {t("landing.forClients")}
              </motion.h2>
              <div className="space-y-4">
                {clientBenefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    className="flex items-center gap-4 rounded-xl bg-secondary p-4"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      {benefit.icon}
                    </div>
                    <span className="text-lg font-medium text-secondary-foreground">
                      {t(`landing.${benefit.key}`)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* For Providers */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="rounded-2xl bg-card p-8 card-glow"
            >
              <motion.h2
                variants={fadeInUp}
                className="mb-6 text-2xl font-bold text-card-foreground"
              >
                {t("landing.forProviders")}
              </motion.h2>
              <div className="space-y-4">
                {providerBenefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    className="flex items-center gap-4 rounded-xl bg-secondary p-4"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      {benefit.icon}
                    </div>
                    <span className="text-lg font-medium text-secondary-foreground">
                      {t(`landing.${benefit.key}`)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="hero-gradient py-20">
        <div className="container text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeInUp}
              className="mb-6 text-3xl font-bold text-primary-foreground md:text-4xl"
            >
              {t("auth.getStarted")}
            </motion.h2>
            <motion.div variants={fadeInUp}>
              <Link to="/auth/signup">
                <Button size="lg" variant="secondary" className="group text-lg">
                  {t("auth.createAccount")}
                  <ArrowIcon className="ms-2 h-5 w-5 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container">
          <div className="mb-6 flex flex-wrap justify-center gap-6">
            <Link
              to="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("footer.privacy")}
            </Link>
            <Link
              to="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("footer.terms")}
            </Link>
            <Link
              to="/help"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("footer.help")}
            </Link>
            <a
              href="mailto:60azsazs@gmail.com"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("footer.contact")}
            </a>
          </div>
          <div className="text-center text-muted-foreground">
            <p>
              © 2026 {t("common.appName")}. {t("footer.rights")}
            </p>
            <p className="mt-2 text-sm">{t("footer.location")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
