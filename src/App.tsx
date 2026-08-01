import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { GuestProvider, useGuest } from "@/contexts/GuestContext";
import { ThemeProvider } from "next-themes";
import { useTranslation } from "react-i18next";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { TrackingConsent } from "@/components/TrackingConsent";

// Layouts
import { ClientLayout } from "@/components/layout/ClientLayout";
import { ProviderLayout } from "@/components/layout/ProviderLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import LandingPage from "@/pages/LandingPage";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import TermsOfServicePage from "@/pages/TermsOfServicePage";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import OnboardingPage from "@/pages/OnboardingPage";
import NotFound from "@/pages/NotFound";
import HelpCenterPage from "@/pages/HelpCenterPage";

// Client pages
import ClientHomePage from "@/pages/client/ClientHomePage";
import ClientSearchPage from "@/pages/client/ClientSearchPage";
import ClientBookingsPage from "@/pages/client/ClientBookingsPage";
import ClientChatsPage from "@/pages/client/ClientChatsPage";
import ClientChatRoomPage from "@/pages/client/ClientChatRoomPage";
import ClientProfilePage from "@/pages/client/ClientProfilePage";
import ProviderViewPage from "@/pages/client/ProviderProfilePage";
import BookingPage from "@/pages/client/BookingPage";
import BookingDetailsPage from "@/pages/client/BookingDetailsPage";
import BecomeProviderPage from "@/pages/client/BecomeProviderPage";
import PaymentCallbackPage from "@/pages/client/PaymentCallbackPage";

// Provider pages
import ProviderDashboardPage from "@/pages/provider/ProviderDashboardPage";
import ProviderServicesPage from "@/pages/provider/ProviderServicesPage";
import ProviderSchedulePage from "@/pages/provider/ProviderSchedulePage";
import ProviderChatsPage from "@/pages/provider/ProviderChatsPage";
import ProviderChatRoomPage from "@/pages/provider/ProviderChatRoomPage";
import ProviderProfilePage from "@/pages/provider/ProviderProfilePage";
import ProviderBookingDetailsPage from "@/pages/provider/ProviderBookingDetailsPage";
import ProviderWalletPage from "@/pages/provider/ProviderWalletPage";
import SubscriptionPaymentPage from "@/pages/provider/SubscriptionPaymentPage";
import SubscriptionCallbackPage from "@/pages/provider/SubscriptionCallbackPage";
import ProviderReviewsPage from "@/pages/provider/ProviderReviewsPage";

// Shared pages (used by both client and provider)
import MyComplaintsPage from "@/pages/shared/MyComplaintsPage";
import ComplaintDetailPage from "@/pages/shared/ComplaintDetailPage";

// Admin pages
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminUserDetailPage from "@/pages/admin/AdminUserDetailPage";
import AdminVerificationsPage from "@/pages/admin/AdminVerificationsPage";
import AdminPayoutsPage from "@/pages/admin/AdminPayoutsPage";
import AdminSubscriptionsPage from "@/pages/admin/AdminSubscriptionsPage";
import AdminReportsPage from "@/pages/admin/AdminReportsPage";
import AdminReportDetailPage from "@/pages/admin/AdminReportDetailPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import AdminOrdersPage from "@/pages/admin/AdminOrdersPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
      gcTime: 1000 * 60 * 30, // Cache kept for 30 minutes
      retry: 1, // Only retry once on failure
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
    },
  },
});

// Root redirect based on user's active role
const RoleBasedRedirect = () => {
  const { user, isAuthenticated } = useAuth();
  const { isGuest } = useGuest();

  // If guest mode is active, redirect to client area
  if (isGuest) {
    return <Navigate to="/client" replace />;
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Use activeRole for navigation
  if (user?.activeRole === "CLIENT") {
    return <Navigate to="/client" replace />;
  } else if (user?.activeRole === "PROVIDER") {
    return <Navigate to="/provider" replace />;
  } else if (user?.activeRole === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  // Fallback: if no activeRole but has roles, use first role
  if (user?.roles?.length > 0) {
    const firstRole = user.roles[0];
    if (firstRole === "PROVIDER") {
      return <Navigate to="/provider" replace />;
    } else if (firstRole === "ADMIN") {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/client" replace />;
  }

  // No roles at all - go to client (default)
  return <Navigate to="/client" replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<RoleBasedRedirect />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/signup" element={<SignupPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/help" element={<HelpCenterPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />

      {/* Onboarding */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* Client routes */}
      <Route
        path="/client"
        element={
          <ProtectedRoute allowedRoles={["CLIENT"]} allowGuest={true}>
            <ClientLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientHomePage />} />
        <Route path="search" element={<ClientSearchPage />} />
        <Route path="bookings" element={<ClientBookingsPage />} />
        <Route path="bookings/:bookingId" element={<BookingDetailsPage />} />
        <Route path="chats" element={<ClientChatsPage />} />
        <Route path="chats/:chatId" element={<ClientChatRoomPage />} />
        <Route path="complaints" element={<MyComplaintsPage />} />
        <Route path="complaints/:id" element={<ComplaintDetailPage />} />
        <Route path="profile" element={<ClientProfilePage />} />
        <Route path="provider/:id" element={<ProviderViewPage />} />
        <Route path="book/:serviceId" element={<BookingPage />} />
        <Route path="payment-callback" element={<PaymentCallbackPage />} />
        <Route path="become-provider" element={<BecomeProviderPage />} />
      </Route>

      {/* Provider routes - allow guests to browse */}
      <Route
        path="/provider"
        element={
          <ProtectedRoute allowedRoles={["PROVIDER"]} allowGuest={true}>
            <ProviderLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ProviderDashboardPage />} />
        <Route
          path="booking/:bookingId"
          element={<ProviderBookingDetailsPage />}
        />
        <Route path="services" element={<ProviderServicesPage />} />
        <Route path="schedule" element={<ProviderSchedulePage />} />
        <Route path="wallet" element={<ProviderWalletPage />} />
        <Route path="chats" element={<ProviderChatsPage />} />
        <Route path="chats/:chatId" element={<ProviderChatRoomPage />} />
        <Route path="complaints" element={<MyComplaintsPage />} />
        <Route path="complaints/:id" element={<ComplaintDetailPage />} />
        <Route path="profile" element={<ProviderProfilePage />} />
        <Route path="reviews" element={<ProviderReviewsPage />} />
        <Route path="subscription" element={<SubscriptionPaymentPage />} />
        <Route
          path="subscription/callback"
          element={<SubscriptionCallbackPage />}
        />
      </Route>

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/:uid" element={<AdminUserDetailPage />} />
        <Route path="verifications" element={<AdminVerificationsPage />} />
        <Route path="payouts" element={<AdminPayoutsPage />} />
        <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="reports/:id" element={<AdminReportDetailPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const VerifyEmailBanner = () => {
  const { firebaseUser, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [isSending, setIsSending] = React.useState(false);

  if (!isAuthenticated || !firebaseUser || firebaseUser.emailVerified) {
    return null;
  }

  const handleResend = async () => {
    try {
      setIsSending(true);
      await sendEmailVerification(firebaseUser);
      toast.success(t("auth.verifyEmailResent"));
    } catch (error) {
      console.error("Failed to resend verification email:", error);
      toast.error(getAuthErrorMessage(error, t));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="container flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold">{t("auth.verifyEmailTitle")}</p>
          <p className="text-xs text-amber-800 dark:text-amber-200">
            {t("auth.verifyEmailDescription")}
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Email: {firebaseUser.email}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleResend}
          disabled={isSending}
          className="border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/40"
        >
          {isSending ? t("common.loading") : t("auth.resendVerification")}
        </Button>
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <GuestProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <TrackingConsent>
                <VerifyEmailBanner />
                <AppRoutes />
              </TrackingConsent>
            </BrowserRouter>
          </TooltipProvider>
        </GuestProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
