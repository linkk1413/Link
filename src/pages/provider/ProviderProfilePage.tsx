import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  User,
  Settings,
  LogOut,
  ChevronRight,
  Wallet,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Globe,
  Bell,
  KeyRound,
  Moon,
  Star,
  Trash2,
  MapPin,
  CheckCircle2,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useGuest } from "@/contexts/GuestContext";
import { useRequestTrackingConsent } from "@/components/TrackingConsent";
import { updateUserProfile } from "@/lib/firestore";
import { storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { sendEmailVerification } from "firebase/auth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SupportContactCard } from "@/components/SupportContactCard";
import {
  useProviderProfile,
  useUpdateProviderProfile,
} from "@/hooks/queries/useProviders";
import {
  useProviderVerification,
  useSubmitVerification,
} from "@/hooks/queries/useVerifications";
import { SAUDI_REGIONS } from "@/lib/saudiLocations";

// Mock data for wallet - would come from Firestore
const mockWallet = {
  balance: 1250.0,
  pendingBalance: 350.0,
  currency: "SAR",
};

const mockTransactions = [
  {
    id: "1",
    type: "credit",
    amount: 150,
    description: "Booking #1234 completed",
    date: new Date(Date.now() - 1000 * 60 * 60 * 2),
    status: "completed",
  },
  {
    id: "2",
    type: "credit",
    amount: 200,
    description: "Booking #1233 completed",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24),
    status: "completed",
  },
  {
    id: "3",
    type: "debit",
    amount: 500,
    description: "Payout to bank account",
    date: new Date(Date.now() - 1000 * 60 * 60 * 48),
    status: "completed",
  },
];

const ProviderProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, firebaseUser, logout, deleteAccount, refreshUser } = useAuth();
  const { isGuest } = useGuest();
  const { requestTrackingConsent, revokeConsent, consentStatus } =
    useRequestTrackingConsent();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const isArabic = i18n.language === "ar";

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { data: providerProfile } = useProviderProfile(user?.uid || "");

  // Email verification status (from Firebase Auth)
  const isEmailVerified = firebaseUser?.emailVerified || false;
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  // Trusted Provider badge — granted automatically server-side (see
  // functions/onReviewWritten) once a provider has 50+ reviews rated above
  // 3 stars. Clients can't write isVerified themselves (firestore.rules).
  const isTrustedProvider = providerProfile?.isVerified || false;

  // Identity verification (admin-approved, required to publish services)
  const { data: verificationRequest } = useProviderVerification(
    user?.uid || "",
  );
  const submitVerificationMutation = useSubmitVerification();
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verificationFiles, setVerificationFiles] = useState<File[]>([]);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);

  const handleSubmitVerification = async () => {
    if (!user || verificationFiles.length === 0) return;
    setIsUploadingDocs(true);
    try {
      const documents = await Promise.all(
        verificationFiles.map(async (file) => {
          const path = `verifications/${user.uid}/${Date.now()}-${file.name}`;
          const fileRef = storageRef(storage, path);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          return { name: file.name, url };
        }),
      );

      await submitVerificationMutation.mutateAsync({
        providerId: user.uid,
        providerName: providerProfile?.displayName || user.name || "",
        providerEmail: user.email || "",
        documents,
      });

      toast.success(t("profile.verificationSubmitted"));
      setVerifyDialogOpen(false);
      setVerificationFiles([]);
    } catch (error) {
      console.error("Failed to submit verification:", error);
      toast.error(t("common.error"));
    } finally {
      setIsUploadingDocs(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!firebaseUser || isSendingVerification) return;
    setIsSendingVerification(true);
    try {
      await sendEmailVerification(firebaseUser);
      toast.success(t("auth.verificationEmailSent"));
    } catch (error) {
      console.error("Error sending verification email:", error);
      toast.error(t("common.error"));
    } finally {
      setIsSendingVerification(false);
    }
  };

  const updateProviderProfileMutation = useUpdateProviderProfile();

  const [formValues, setFormValues] = useState({
    displayName: providerProfile?.displayName || user?.name || "",
    email: user?.email || "",
    phone: providerProfile?.phone || "",
    region: providerProfile?.region || "",
    city: providerProfile?.city || "",
    district: providerProfile?.area || "",
    bio: providerProfile?.bio || "",
    latitude: providerProfile?.latitude,
    longitude: providerProfile?.longitude,
    bankAccountHolder: providerProfile?.bankAccountHolder || "",
    bankName: providerProfile?.bankName || "",
    bankAccountNumber: providerProfile?.bankAccountNumber || "",
    bankIBAN: providerProfile?.bankIBAN || "",
  });

  useEffect(() => {
    const inferredRegion =
      providerProfile?.region ||
      (providerProfile?.city
        ? SAUDI_REGIONS.find((region) =>
            region.cities.some((city) => city.value === providerProfile.city),
          )?.value || ""
        : "");

    setFormValues({
      displayName: providerProfile?.displayName || user?.name || "",
      email: user?.email || "",
      phone: providerProfile?.phone || "",
      region: inferredRegion,
      city: providerProfile?.city || "",
      district: providerProfile?.area || "",
      bio: providerProfile?.bio || "",
      latitude: providerProfile?.latitude,
      longitude: providerProfile?.longitude,
      bankAccountHolder: providerProfile?.bankAccountHolder || "",
      bankName: providerProfile?.bankName || "",
      bankAccountNumber: providerProfile?.bankAccountNumber || "",
      bankIBAN: providerProfile?.bankIBAN || "",
    });
  }, [providerProfile, user]);

  const completionPercent = useMemo(() => {
    const fields = [
      formValues.displayName,
      formValues.email,
      formValues.phone,
      formValues.region,
      formValues.city,
      formValues.district,
      formValues.bio,
    ];
    const filled = fields.filter((value) => value?.toString().trim()).length;
    return Math.round((filled / fields.length) * 100);
  }, [formValues]);

  const selectedRegion = useMemo(
    () => SAUDI_REGIONS.find((region) => region.value === formValues.region),
    [formValues.region],
  );

  const cityOptions = selectedRegion?.cities || [];

  const selectedCity = useMemo(
    () => cityOptions.find((city) => city.value === formValues.city),
    [cityOptions, formValues.city],
  );

  const districtOptions = selectedCity?.districts || [];

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} ${mockWallet.currency}`;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffHours < 24) {
      return date.toLocaleTimeString(isArabic ? "ar-SA" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffHours < 48) {
      return t("chat.yesterday");
    } else {
      return date.toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const getLabel = (item: { label: { en: string; ar: string } }) =>
    isArabic ? item.label.ar : item.label.en;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toast.error(t("profile.enterPassword"));
      return;
    }
    setIsDeletingAccount(true);
    try {
      await deleteAccount(deletePassword);
      setDeleteAccountDialogOpen(false);
      setDeletePassword("");
      navigate("/");
    } catch (error: unknown) {
      console.error("Failed to delete account:", error);
      // Handle wrong password error
      const errorCode = (error as { code?: string; message?: string })?.code || (error as { code?: string; message?: string })?.message || "";
      if (
        errorCode.includes("wrong-password") ||
        errorCode.includes("invalid-credential") ||
        errorCode.includes("INVALID_LOGIN_CREDENTIALS")
      ) {
        toast.error(t("profile.wrongPassword"));
      } else {
        toast.error(t("common.error"));
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleRequestPayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0 || amount > mockWallet.balance) return;

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    setPayoutDialogOpen(false);
    setPayoutAmount("");
  };

  const handleEditToggle = () => {
    setIsEditing((prev) => !prev);
  };

  const handleCancelEdit = () => {
    setFormValues({
      displayName: providerProfile?.displayName || user?.name || "",
      email: user?.email || "",
      phone: providerProfile?.phone || "",
      region: providerProfile?.region || "",
      city: providerProfile?.city || "",
      district: providerProfile?.area || "",
      bio: providerProfile?.bio || "",
      latitude: providerProfile?.latitude,
      longitude: providerProfile?.longitude,
      // Bank fields must be restored too, otherwise cancelling an edit blanks
      // them in the form and the next save wipes the stored account details.
      bankAccountHolder: providerProfile?.bankAccountHolder || "",
      bankName: providerProfile?.bankName || "",
      bankAccountNumber: providerProfile?.bankAccountNumber || "",
      bankIBAN: providerProfile?.bankIBAN || "",
    });
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    await Promise.all([
      updateProviderProfileMutation.mutateAsync({
        uid: user.uid,
        updates: {
          displayName: formValues.displayName,
          phone: formValues.phone,
          region: formValues.region,
          city: formValues.city,
          area: formValues.district,
          bio: formValues.bio,
          latitude: formValues.latitude,
          longitude: formValues.longitude,
          bankAccountHolder: formValues.bankAccountHolder,
          bankName: formValues.bankName,
          bankAccountNumber: formValues.bankAccountNumber,
          bankIBAN: formValues.bankIBAN,
        },
      }),
      updateUserProfile(user.uid, {
        name: formValues.displayName,
      }),
    ]);
    await refreshUser();
    setIsEditing(false);
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container py-4">
          <h1 className="text-xl font-semibold text-foreground">
            {t("nav.profile")}
          </h1>
        </div>
      </header>

      <main className="container py-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {/* Profile Completion */}
          <motion.div variants={fadeInUp} className="mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-foreground">
                    {t("profile.completion")}
                  </p>
                  <span className="text-sm font-semibold text-primary">
                    {completionPercent}%
                  </span>
                </div>
                <Progress value={completionPercent} className="h-2" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("profile.completePercent", { percent: completionPercent })}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Reviews Card */}
          <motion.div variants={fadeInUp} className="mb-6">
            <Card
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate("/provider/reviews")}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Star className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {t("providerReviews.title")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {providerProfile?.ratingAvg?.toFixed(1) || "0.0"} ★ ·{" "}
                        {providerProfile?.ratingCount || 0}{" "}
                        {t("provider.reviews")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Profile Card */}
          <motion.div variants={fadeInUp} className="mb-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {t("profile.personalInfo")}
                  </CardTitle>
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditToggle}
                    >
                      {t("profile.editProfile")}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveProfile}
                        disabled={updateProviderProfileMutation.isPending}
                      >
                        {updateProviderProfileMutation.isPending
                          ? t("common.loading")
                          : t("profile.save")}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-foreground">
                      {formValues.displayName || t("profile.guest")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t("common.provider")}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="profile-name">
                      {t("profile.fullName")}
                    </Label>
                    <Input
                      id="profile-name"
                      value={formValues.displayName}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          displayName: e.target.value,
                        }))
                      }
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile-email">{t("profile.email")}</Label>
                    <Input
                      id="profile-email"
                      value={formValues.email}
                      disabled
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile-phone">{t("profile.phone")}</Label>
                    <Input
                      id="profile-phone"
                      value={formValues.phone}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      placeholder={t("profile.addPhone")}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile-region">
                      {t("profile.region")}
                    </Label>
                    <Select
                      value={formValues.region}
                      onValueChange={(value) =>
                        setFormValues((prev) => ({
                          ...prev,
                          region: value,
                          city: "",
                          district: "",
                        }))
                      }
                      disabled={!isEditing}
                    >
                      <SelectTrigger id="profile-region" className="mt-1">
                        <SelectValue
                          placeholder={t("profile.regionPlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {SAUDI_REGIONS.map((region) => (
                          <SelectItem key={region.value} value={region.value}>
                            {getLabel(region)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="profile-city">{t("profile.city")}</Label>
                    <Select
                      value={formValues.city}
                      onValueChange={(value) =>
                        setFormValues((prev) => ({
                          ...prev,
                          city: value,
                          district: "",
                        }))
                      }
                      disabled={!isEditing || !formValues.region}
                    >
                      <SelectTrigger id="profile-city" className="mt-1">
                        <SelectValue
                          placeholder={t("profile.cityPlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {cityOptions.map((city) => (
                          <SelectItem key={city.value} value={city.value}>
                            {getLabel(city)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* District is typed by hand — the dropdown never covered
                      every neighbourhood in the kingdom. */}
                  <div>
                    <Label htmlFor="profile-district">
                      {t("profile.district")}
                    </Label>
                    <Input
                      id="profile-district"
                      value={formValues.district}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          district: e.target.value,
                        }))
                      }
                      placeholder={t("profile.districtPlaceholder")}
                      disabled={!isEditing}
                      className="mt-1"
                      list="district-suggestions"
                    />
                    {/* Known districts for the chosen city, as suggestions only */}
                    <datalist id="district-suggestions">
                      {districtOptions.map((district) => (
                        <option key={district.value} value={getLabel(district)} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="profile-bio">{t("profile.bio")}</Label>
                  <Textarea
                    id="profile-bio"
                    value={formValues.bio}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                    placeholder={t("profile.bioPlaceholder")}
                    disabled={!isEditing}
                    className="mt-1 min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Bank Account Section */}
          <motion.div variants={fadeInUp} className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {t("profile.bankAccount")}
            </h2>
            <Card>
              <CardContent className="p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="bank-holder">
                      {t("profile.accountHolder")}
                    </Label>
                    <Input
                      id="bank-holder"
                      value={formValues.bankAccountHolder}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          bankAccountHolder: e.target.value,
                        }))
                      }
                      placeholder={t("profile.accountHolderPlaceholder")}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank-name">{t("profile.bankName")}</Label>
                    <Input
                      id="bank-name"
                      value={formValues.bankName}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          bankName: e.target.value,
                        }))
                      }
                      placeholder={t("profile.bankNamePlaceholder")}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="account-number">
                      {t("profile.accountNumber")}
                    </Label>
                    <Input
                      id="account-number"
                      value={formValues.bankAccountNumber}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          bankAccountNumber: e.target.value,
                        }))
                      }
                      placeholder={t("profile.accountNumberPlaceholder")}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="iban">{t("profile.iban")}</Label>
                    <Input
                      id="iban"
                      value={formValues.bankIBAN}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          bankIBAN: e.target.value,
                        }))
                      }
                      placeholder={t("profile.ibanPlaceholder")}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Customer support contact */}
          <motion.div variants={fadeInUp} className="mb-6">
            <SupportContactCard />
          </motion.div>

          {/* Wallet Section */}
          {/* Settings Section */}
          <motion.div variants={fadeInUp} className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {t("profile.accountSettings")}
            </h2>
            <Card>
              <CardContent className="p-0">
                {/* Language */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <span>{t("profile.language")}</span>
                  </div>
                  <LanguageSwitcher />
                </div>

                {/* Dark Mode */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-3">
                    <Moon className="h-5 w-5 text-muted-foreground" />
                    <span>{t("profile.darkMode")}</span>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) =>
                      setTheme(checked ? "dark" : "light")
                    }
                  />
                </div>

                {/* Email Verification */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    <span>{t("profile.emailVerification")}</span>
                  </div>
                  {isEmailVerified ? (
                    <Badge className="bg-green-500">
                      {t("profile.verified")}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSendingVerification}
                      onClick={handleResendVerificationEmail}
                    >
                      {isSendingVerification
                        ? t("common.sending")
                        : t("profile.verifyEmail")}
                    </Button>
                  )}
                </div>

                {/* Identity Verification (required to publish services) */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    <span>{t("profile.identityVerification")}</span>
                  </div>
                  {providerProfile?.identityVerified ? (
                    <Badge className="bg-green-500">
                      {t("profile.verified")}
                    </Badge>
                  ) : verificationRequest?.status === "PENDING" ? (
                    <Badge variant="secondary">
                      {t("admin.pending")}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setVerifyDialogOpen(true)}
                    >
                      {verificationRequest?.status === "REJECTED"
                        ? t("profile.resubmitVerification")
                        : t("profile.verifyIdentity")}
                    </Button>
                  )}
                </div>
                {verificationRequest?.status === "REJECTED" &&
                  !providerProfile?.identityVerified && (
                    <div className="border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
                      {verificationRequest.reason ||
                        t("profile.verificationRejectedGeneric")}
                    </div>
                  )}

                {/* Trusted Provider Badge */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    <span>{t("profile.trustedProviderBadge")}</span>
                  </div>
                  {isTrustedProvider ? (
                    <Badge className="bg-blue-500 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {t("profile.trusted")}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t("profile.trustedBadgeHint")}
                    </span>
                  )}
                </div>

                {/* Location Access */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{t("profile.locationAccess")}</span>
                      <span className="text-xs text-muted-foreground">
                        {t("profile.locationAccessDescription")}
                      </span>
                    </div>
                  </div>
                  <Switch
                    checked={consentStatus === "granted"}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        requestTrackingConsent();
                      } else {
                        revokeConsent();
                        toast.success(t("profile.locationAccessRevoked"));
                      }
                    }}
                  />
                </div>

                {/* Reset Password */}
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-4 border-b text-left"
                  onClick={() => navigate("/auth/forgot-password")}
                >
                  <div className="flex items-center gap-3">
                    <KeyRound className="h-5 w-5 text-muted-foreground" />
                    <span>{t("auth.resetPassword")}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>

                {/* My complaints */}
                <button
                  type="button"
                  className="flex w-full items-center justify-between border-b p-4 text-left"
                  onClick={() => navigate("/provider/complaints")}
                >
                  <div className="flex items-center gap-3">
                    <Flag className="h-5 w-5 text-muted-foreground" />
                    <span>{t("complaints.title")}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>

                {/* Help */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                    <span>{t("profile.helpCenter")}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/help")}
                    className="text-muted-foreground"
                  >
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Logout Button - Hidden for guests */}
          {!isGuest && (
            <motion.div variants={fadeInUp}>
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/50 hover:bg-destructive/10"
                onClick={() => setLogoutDialogOpen(true)}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t("common.logout")}
              </Button>
            </motion.div>
          )}

          {/* Delete Account Button - Hidden for guests */}
          {!isGuest && (
            <motion.div variants={fadeInUp}>
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/50 hover:bg-destructive/10"
                onClick={() => setDeleteAccountDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("profile.deleteAccount")}
              </Button>
            </motion.div>
          )}

          {/* Guest CTA - Sign up or Login */}
          {isGuest && (
            <motion.div variants={fadeInUp} className="space-y-3">
              <p className="text-center text-muted-foreground text-sm">
                {t("guest.createAccountPrompt")}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => navigate("/signup")}
                >
                  {t("common.signup")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/login")}
                >
                  {t("common.login")}
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* Logout Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("profile.logoutTitle")}</DialogTitle>
            <DialogDescription>
              {t("profile.logoutDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLogoutDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              {t("common.logout")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={deleteAccountDialogOpen}
        onOpenChange={(open) => {
          setDeleteAccountDialogOpen(open);
          if (!open) setDeletePassword("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {t("profile.deleteAccountTitle")}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <p>{t("profile.deleteAccountDescription")}</p>
                <p className="font-semibold text-destructive">
                  {t("profile.deleteAccountWarning")}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="delete-password-provider">
              {t("profile.confirmPassword")}
            </Label>
            <Input
              id="delete-password-provider"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder={t("profile.enterPasswordToConfirm")}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteAccountDialogOpen(false);
                setDeletePassword("");
              }}
              disabled={isDeletingAccount}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount || !deletePassword.trim()}
            >
              {isDeletingAccount
                ? t("common.loading")
                : t("profile.deleteAccount")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Payout Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("wallet.requestPayout")}</DialogTitle>
            <DialogDescription>
              {t("wallet.payoutDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="amount">{t("wallet.amount")}</Label>
              <Input
                id="amount"
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
              <p className="mt-1 text-sm text-muted-foreground">
                {t("wallet.available")}: {formatCurrency(mockWallet.balance)}
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">{t("wallet.payoutWarning")}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayoutDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleRequestPayout}
              disabled={
                isLoading ||
                !payoutAmount ||
                parseFloat(payoutAmount) <= 0 ||
                parseFloat(payoutAmount) > mockWallet.balance
              }
            >
              {isLoading ? t("common.loading") : t("wallet.requestPayout")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Identity Verification Dialog */}
      <Dialog
        open={verifyDialogOpen}
        onOpenChange={(open) => {
          setVerifyDialogOpen(open);
          if (!open) setVerificationFiles([]);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("profile.verifyIdentity")}</DialogTitle>
            <DialogDescription>
              {t("profile.verifyIdentityHint")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={(e) =>
                setVerificationFiles(Array.from(e.target.files || []))
              }
            />
            {verificationFiles.length > 0 && (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {verificationFiles.map((file) => (
                  <li key={file.name}>{file.name}</li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVerifyDialogOpen(false)}
              disabled={isUploadingDocs}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmitVerification}
              disabled={verificationFiles.length === 0 || isUploadingDocs}
            >
              {isUploadingDocs
                ? t("common.uploading")
                : t("profile.submitVerification")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderProfilePage;
