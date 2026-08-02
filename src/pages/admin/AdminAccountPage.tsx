import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  User as UserIcon,
  Mail,
  Phone,
  KeyRound,
  History,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail,
  updatePassword,
  updateProfile as updateFirebaseProfile,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile } from "@/lib/firestore";
import { useLoginHistory } from "@/hooks/queries/useUsers";

const isStrongPassword = (value: string) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value);

const AdminAccountPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { user, firebaseUser, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [isSavingName, setIsSavingName] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [isSendingEmailChange, setIsSendingEmailChange] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { data: loginHistory = [], isLoading: loadingHistory } =
    useLoginHistory(user?.uid || "");

  const reauth = async (password: string) => {
    if (!firebaseUser?.email) throw new Error("No authenticated user");
    const credential = EmailAuthProvider.credential(firebaseUser.email, password);
    await reauthenticateWithCredential(firebaseUser, credential);
  };

  const handleSaveName = async () => {
    if (!user || !firebaseUser || !name.trim()) return;
    setIsSavingName(true);
    try {
      await Promise.all([
        updateUserProfile(user.uid, { name: name.trim() }),
        updateFirebaseProfile(firebaseUser, { displayName: name.trim() }),
      ]);
      await refreshUser();
      toast.success(t("common.success"));
    } catch (error) {
      console.error("Failed to update name:", error);
      toast.error(t("common.error"));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!firebaseUser || !newEmail.trim() || !emailPassword) return;
    setIsSendingEmailChange(true);
    try {
      await reauth(emailPassword);
      await verifyBeforeUpdateEmail(firebaseUser, newEmail.trim());
      toast.success(t("adminAccount.emailChangeSent"));
      setNewEmail("");
      setEmailPassword("");
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error(t("adminAccount.wrongCurrentPassword"));
      } else if (code === "auth/email-already-in-use") {
        toast.error(t("auth.errors.emailInUse"));
      } else {
        console.error("Failed to start email change:", error);
        toast.error(t("common.error"));
      }
    } finally {
      setIsSendingEmailChange(false);
    }
  };

  const handleChangePassword = async () => {
    if (!firebaseUser || !currentPassword || !newPassword) return;
    if (!isStrongPassword(newPassword)) {
      toast.error(t("auth.passwordRequirements"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("adminAccount.passwordsDontMatch"));
      return;
    }
    setIsChangingPassword(true);
    try {
      await reauth(currentPassword);
      await updatePassword(firebaseUser, newPassword);
      toast.success(t("adminAccount.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error(t("adminAccount.wrongCurrentPassword"));
      } else {
        console.error("Failed to change password:", error);
        toast.error(t("common.error"));
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const formatDateTime = (date: Date) =>
    new Date(date).toLocaleString(isArabic ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t("adminAccount.title")}
        </h1>
        <p className="text-muted-foreground">{t("adminAccount.subtitle")}</p>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        className="space-y-6"
      >
        {/* Personal info */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserIcon className="h-5 w-5 text-primary" />
                {t("adminAccount.personalInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span dir="ltr">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span dir="ltr">{user.phone}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-name">{t("profile.fullName")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="account-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Button
                    onClick={handleSaveName}
                    disabled={isSavingName || !name.trim() || name === user.name}
                  >
                    {isSavingName && (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    )}
                    {t("common.save")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Change email */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-5 w-5 text-primary" />
                {t("adminAccount.changeEmail")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("adminAccount.changeEmailDescription")}
              </p>
              <div className="space-y-2">
                <Label htmlFor="new-email">{t("adminAccount.newEmail")}</Label>
                <Input
                  id="new-email"
                  type="email"
                  dir="ltr"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-current-password">
                  {t("adminAccount.currentPassword")}
                </Label>
                <Input
                  id="email-current-password"
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                />
              </div>
              <Button
                onClick={handleChangeEmail}
                disabled={
                  isSendingEmailChange || !newEmail.trim() || !emailPassword
                }
              >
                {isSendingEmailChange && (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                )}
                {t("adminAccount.sendVerification")}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Change password */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-5 w-5 text-primary" />
                {t("adminAccount.changePassword")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">
                  {t("adminAccount.currentPassword")}
                </Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("adminAccount.newPassword")}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("auth.passwordRequirements")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">
                  {t("adminAccount.confirmPassword")}
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={
                  isChangingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
              >
                {isChangingPassword && (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                )}
                {t("adminAccount.changePassword")}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {t("adminAccount.security")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("adminAccount.lastLogin")}
                </span>
                <span className="font-medium text-foreground">
                  {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}
                </span>
              </div>
              {user.lastLoginDevice && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("adminAccount.lastLoginDevice")}
                  </span>
                  <span
                    className="max-w-[60%] truncate text-end font-medium text-foreground"
                    title={user.lastLoginDevice}
                  >
                    {user.lastLoginDevice}
                  </span>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <History className="h-4 w-4" />
                  {t("adminAccount.loginHistory")}
                </div>
                {loadingHistory ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : loginHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("adminAccount.noLoginHistory")}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {loginHistory.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {formatDateTime(entry.createdAt)}
                        </span>
                        {entry.device && (
                          <span
                            className="max-w-[55%] truncate text-end text-muted-foreground"
                            title={entry.device}
                          >
                            {entry.device}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminAccountPage;
