import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  Phone,
  Mail,
  Clock,
  AlertCircle,
  CreditCard,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionSettings } from "@/hooks/queries/useSubscriptionSettings";
import PayPalCheckout from "@/components/payments/PayPalCheckout";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Default admin contact info (fallback if not set in database)
const DEFAULT_CONTACT = {
  phone: "+966 55 297 9710",
  email: "support@linkbloom.com",
  whatsapp: "https://wa.me/966552979710",
};

const SubscriptionPaymentPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isArabic = i18n.language === "ar";
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<"paypal" | "bank_transfer">("paypal");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Fetch subscription settings from database
  const { data: settings, isLoading: settingsLoading } =
    useSubscriptionSettings();

  // Get contact info from settings with fallbacks
  const ADMIN_CONTACT = useMemo(() => ({
    phone: settings?.contactPhone || DEFAULT_CONTACT.phone,
    email: settings?.contactEmail || DEFAULT_CONTACT.email,
    whatsapp: settings?.contactWhatsapp || DEFAULT_CONTACT.whatsapp,
  }), [settings]);

  // Build plans from settings
  const plans = useMemo(() => {
    if (!settings?.plans) return [];

    const monthlyPlan = settings.plans.find((p) => p.months === 1);
    const monthlyPrice = monthlyPlan?.price || settings.monthlyPrice || 10;

    return settings.plans
      .filter((plan) => plan.isActive)
      .map((plan) => {
        // Calculate savings based on what full price would be
        const fullPrice = monthlyPrice * plan.months;
        const savings = fullPrice - plan.price;

        return {
          id: plan.id,
          name:
            plan.months === 1
              ? t("subscription.monthlyPlan") || "Monthly"
              : plan.months === 6
                ? t("subscription.halfYearlyPlan") || "Half Year (6 Months)"
                : plan.months === 12
                  ? t("subscription.yearlyPlan") || "Yearly"
                  : `${plan.months} ${t("subscription.months") || "months"}`,
          months: plan.months,
          price: plan.price,
          savings: savings > 0 ? savings : 0,
          recommended: plan.months === 1, // Monthly is recommended by default
          discountPercent: plan.discountPercent,
        };
      })
      .sort((a, b) => a.months - b.months);
  }, [settings, t]);

  // Get selected plan object
  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return plans[0] || null;
    return plans.find((p) => p.id === selectedPlanId) || plans[0] || null;
  }, [selectedPlanId, plans]);

  // Set default plan when plans load
  React.useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  // Handle PayPal payment success
  const handlePayPalAuthorized = async (payload: {
    orderId: string;
    authorizationId: string;
    amountUsd: number;
    fxRate: number;
  }) => {
    if (!user || !selectedPlan) {
      setPaymentError(t("common.error"));
      return;
    }

    setIsPaying(true);
    setPaymentError(null);

    try {
      // Calculate subscription end date
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + selectedPlan.months);

      const subscriptionData = {
        subscriptionStatus: "active",
        subscriptionStartDate: Timestamp.fromDate(now),
        subscriptionEndDate: Timestamp.fromDate(endDate),
        subscriptionPlanId: selectedPlan.id,
        subscriptionPlanMonths: selectedPlan.months,
        lastPaymentDate: Timestamp.fromDate(now),
        lastPaymentAmount: selectedPlan.price,
        lastPaymentGateway: "PAYPAL",
        lastPaymentOrderId: payload.orderId,
        lastPaymentAuthorizationId: payload.authorizationId,
        accountStatus: "ACTIVE",
        isSubscribed: true,
      };

      // Update BOTH users and providers collections (banner reads from providers)
      const userRef = doc(db, "users", user.uid);
      const providerRef = doc(db, "providers", user.uid);
      
      await Promise.all([
        updateDoc(userRef, subscriptionData),
        updateDoc(providerRef, subscriptionData),
      ]);

      // Notify admin about the subscription payment (fire and forget)
      const serverUrl = import.meta.env.VITE_SERVER_URL || "https://server-link-190979667993.europe-west3.run.app";
      fetch(`${serverUrl}/api/email/notify-admin-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerName: user.name,
          providerEmail: user.email,
          providerId: user.uid,
          planName: selectedPlan.name,
          planMonths: selectedPlan.months,
          amount: selectedPlan.price,
          orderId: payload.orderId,
          gateway: "PayPal",
        }),
      }).catch((err) => console.warn("Admin notification failed:", err));

      setPaymentSuccess(true);
      toast.success(t("subscription.paymentSuccess") || "Payment successful! Your subscription is now active.");
    } catch (error) {
      console.error("Failed to activate subscription:", error);
      setPaymentError(t("common.error"));
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">
            {t("subscription.renewSubscription") || "Renew Subscription"}
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-2xl"
        >
          {/* Account Info */}
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">
                {t("subscription.accountInfo") || "Account Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {t("common.email")}:
                </span>{" "}
                {user?.email}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {t("common.name")}:
                </span>{" "}
                {user?.name}
              </p>
            </CardContent>
          </Card>

          {/* Plans */}
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              {t("subscription.choosePlan") || "Choose Your Plan"}
            </h2>
            {settingsLoading ? (
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6">
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-10 w-32 mb-2" />
                    <Skeleton className="h-4 w-20" />
                  </Card>
                ))}
              </div>
            ) : plans.length === 0 ? (
              <Card className="p-6 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {t("subscription.noPlansAvailable") ||
                    "No subscription plans available at this time."}
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {plans.map((plan) => (
                  <motion.div
                    key={plan.id}
                    whileHover={{ y: -4 }}
                    className="relative"
                  >
                    {plan.recommended && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">
                          {t("subscription.recommended") || "Recommended"}
                        </Badge>
                      </div>
                    )}
                    <Card
                      className={`cursor-pointer transition-all ${
                        selectedPlanId === plan.id
                          ? "border-primary ring-2 ring-primary/50"
                          : "border-border"
                      }`}
                      onClick={() => setSelectedPlanId(plan.id)}
                    >
                      <CardHeader>
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        {plan.savings > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Save {plan.savings.toFixed(0)} SAR
                          </p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4">
                          <div className="text-3xl font-bold text-foreground">
                            {plan.price.toFixed(0)}
                            <span className="text-sm font-normal text-muted-foreground">
                              {" "}
                              SAR
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {plan.months === 1
                              ? t("subscription.perMonth") || "per month"
                              : `${plan.months} ${t("subscription.months") || "months"}`}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">
                {t("subscription.paymentMethod") || "Payment Method"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* PayPal Payment */}
              <div
                className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-all ${
                  selectedMethod === "paypal"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedMethod("paypal")}
              >
                <input
                  type="radio"
                  checked={selectedMethod === "paypal"}
                  onChange={() => setSelectedMethod("paypal")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">
                      {t("subscription.paypalPayment") || "PayPal / Card Payment"}
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("subscription.paypalPaymentDesc") ||
                      "Pay instantly with PayPal or debit/credit card"}
                  </p>
                </div>
              </div>

              {/* Bank Transfer */}
              <div
                className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-all ${
                  selectedMethod === "bank_transfer"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedMethod("bank_transfer")}
              >
                <input
                  type="radio"
                  checked={selectedMethod === "bank_transfer"}
                  onChange={() => setSelectedMethod("bank_transfer")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground">
                      {t("subscription.bankTransfer") || "Bank Transfer"}
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("subscription.bankTransferDesc") ||
                      "Transfer funds directly to our bank account"}
                  </p>
                </div>
              </div>

              {/* PayPal Checkout */}
              {selectedMethod === "paypal" && selectedPlan && (
                <div className="mt-4 rounded-lg border border-primary/20 bg-card p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("subscription.totalAmount") || "Total Amount"}:
                    </span>
                    <span className="text-lg font-bold text-foreground">
                      {selectedPlan.price} SAR
                    </span>
                  </div>
                  
                  {paymentError && (
                    <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                      {paymentError}
                    </div>
                  )}

                  <PayPalCheckout
                    amount={selectedPlan.price}
                    bookingMeta={{
                      serviceId: `subscription_${selectedPlan.id}`,
                      providerId: user?.uid || "",
                    }}
                    onAuthorized={handlePayPalAuthorized}
                    onError={(message) => setPaymentError(message)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Contact Info - only show for bank transfer */}
          {selectedMethod === "bank_transfer" && (
          <Card className="mb-8 border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-amber-900 dark:text-amber-100">
                <AlertCircle className="h-5 w-5" />
                {t("subscription.contactAdmin") || "Contact Our Team"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t("subscription.contactAdminDesc") ||
                  "For payment inquiries or to complete your subscription, please reach out to us:"}
              </p>

              <div className="space-y-3">
                {/* Phone */}
                <a
                  href={`tel:${ADMIN_CONTACT.phone}`}
                  className="flex items-center gap-3 rounded-lg border border-amber-300 bg-white p-3 transition-colors hover:bg-amber-50 dark:border-amber-700 dark:bg-amber-950/50 dark:hover:bg-amber-900/50"
                >
                  <Phone className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1">
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {t("subscription.callUs") || "Call Us"}
                    </p>
                    <p className="font-semibold text-amber-900 dark:text-amber-100">
                      {ADMIN_CONTACT.phone}
                    </p>
                  </div>
                  <ArrowLeft className="h-4 w-4 rotate-180 text-amber-600 dark:text-amber-400" />
                </a>

                {/* WhatsApp */}
                <a
                  href={ADMIN_CONTACT.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-green-300 bg-white p-3 transition-colors hover:bg-green-50 dark:border-green-700 dark:bg-green-950/50 dark:hover:bg-green-900/50"
                >
                  <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {t("subscription.whatsapp") || "WhatsApp"}
                    </p>
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      {ADMIN_CONTACT.phone}
                    </p>
                  </div>
                  <ArrowLeft className="h-4 w-4 rotate-180 text-green-600 dark:text-green-400" />
                </a>

                {/* Email */}
                <a
                  href={`mailto:${ADMIN_CONTACT.email}`}
                  className="flex items-center gap-3 rounded-lg border border-blue-300 bg-white p-3 transition-colors hover:bg-blue-50 dark:border-blue-700 dark:bg-blue-950/50 dark:hover:bg-blue-900/50"
                >
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {t("subscription.email") || "Email"}
                    </p>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      {ADMIN_CONTACT.email}
                    </p>
                  </div>
                  <ArrowLeft className="h-4 w-4 rotate-180 text-blue-600 dark:text-blue-400" />
                </a>
              </div>

              {/* Response Time Info */}
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-white/50 p-3 dark:bg-black/20">
                <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  {t("subscription.responseTime") ||
                    "Our team typically responds within 2-4 hours during business hours (8 AM - 8 PM GST)"}
                </p>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Payment Success */}
          {paymentSuccess && (
            <Card className="mb-8 border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/40">
              <CardContent className="p-6 text-center">
                <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
                  {t("subscription.paymentSuccess") || "Payment Successful!"}
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                  {t("subscription.subscriptionActivated") || 
                    "Your subscription has been activated. You now have full access to all provider features."}
                </p>
                <Button onClick={() => navigate("/provider")} className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t("subscription.goToDashboard") || "Go to Dashboard"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons - only show if not success */}
          {!paymentSuccess && (
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              {t("common.cancel")}
            </Button>
            {selectedMethod === "bank_transfer" && (
              <Button
                onClick={() => {
                  toast.info(
                    t("subscription.contactAdminMessage") ||
                      "Please contact the admin using the information above to complete your subscription payment.",
                  );
                }}
                className="flex-1 gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {t("subscription.proceedToPayment") || "Proceed"}
              </Button>
            )}
          </div>
          )}

          {/* Info Banner */}
          {!paymentSuccess && (
          <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/40">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <span className="font-semibold">
                {t("subscription.note") || "Note:"}
              </span>{" "}
              {t("subscription.noteDesc") ||
                "Your subscription will activate immediately after payment is verified. You'll receive a confirmation email with your receipt."}
            </p>
          </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default SubscriptionPaymentPage;
