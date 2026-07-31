import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Lock,
  Unlock,
  Calendar,
  AlertCircle,
  Edit2,
  CheckCircle,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUsers } from "@/hooks/queries/useUsers";
import { useUpdateProviderProfile } from "@/hooks/queries/useProviders";
import { useSubscriptionSettings } from "@/hooks/queries/useSubscriptionSettings";
import { ProviderProfile } from "@/types";
import {
  getProvidersByIds,
  verifySubscriptionPayment,
  updateSubscriptionStatus,
  grantTrialToProvider,
} from "@/lib/firestore";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const AdminSubscriptionsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isArabic = i18n.language === "ar";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "TRIAL" | "EXPIRED" | "LOCKED"
  >("ALL");
  const [lockDialog, setLockDialog] = useState<{
    open: boolean;
    provider: ProviderProfile | null;
    action: "lock" | "unlock" | null;
  }>({ open: false, provider: null, action: null });

  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    provider: ProviderProfile | null;
  }>({ open: false, provider: null });

  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    provider: ProviderProfile | null;
    notes: string;
    paymentDate: string;
    paymentAmount: string;
    paymentMethod: "BANK_TRANSFER" | "CARD" | "OTHER";
  }>({
    open: false,
    provider: null,
    notes: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentAmount: "",
    paymentMethod: "BANK_TRANSFER",
  });

  const [trialDialog, setTrialDialog] = useState<{
    open: boolean;
    provider: ProviderProfile | null;
    trialDays: string;
  }>({
    open: false,
    provider: null,
    trialDays: "14",
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

  const { data: users = [], isLoading } = useUsers();
  const updateProviderMutation = useUpdateProviderProfile();
  const { data: subscriptionSettings } = useSubscriptionSettings();

  // Finds how many months a plan covers by matching its configured price —
  // falls back to 1 month if the provider's price doesn't match any plan
  // (e.g. a legacy/custom price).
  const monthsForPrice = (price: number | undefined): number => {
    const plan = subscriptionSettings?.plans?.find((p) => p.price === price);
    return plan?.months || 1;
  };

  // Get all providers - check both roles array and legacy role field
  const providers = useMemo(() => {
    return users.filter(
      (user) => user.roles?.includes("PROVIDER") || user.role === "PROVIDER",
    );
  }, [users]);

  // Get provider profiles and subscription data
  const [providerProfiles, setProviderProfiles] = useState<
    Map<string, ProviderProfile>
  >(new Map());

  React.useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoadingProfiles(true);
      try {
        const profileList = await getProvidersByIds(
          providers.map((p) => p.uid),
        );
        const profiles = new Map<string, ProviderProfile>();
        profileList.forEach((profile) => profiles.set(profile.uid, profile));
        setProviderProfiles(profiles);
      } finally {
        setIsLoadingProfiles(false);
      }
    };
    if (providers.length > 0) {
      fetchProfiles();
    } else {
      setIsLoadingProfiles(false);
    }
  }, [providers]);

  // Filter subscriptions
  const filteredSubscriptions = useMemo(() => {
    return providers
      .map((user) => {
        const profile = providerProfiles.get(user.uid);
        return {
          user,
          profile,
        };
      })
      .filter((item) => {
        const name = item.user.name.toLowerCase();
        const email = item.user.email.toLowerCase();
        const query = searchQuery.toLowerCase();

        const matchesSearch = name.includes(query) || email.includes(query);

        if (statusFilter === "ALL") return matchesSearch;
        if (statusFilter === "LOCKED")
          return matchesSearch && item.profile?.accountStatus === "LOCKED";
        if (statusFilter === "TRIAL")
          return matchesSearch && item.profile?.subscriptionStatus === "TRIAL";
        return (
          matchesSearch && item.profile?.subscriptionStatus === statusFilter
        );
      });
  }, [providers, providerProfiles, searchQuery, statusFilter]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const profiles = Array.from(providerProfiles.values());
    const active = profiles.filter(
      (p) => p.subscriptionStatus === "ACTIVE" && p.accountStatus === "ACTIVE",
    ).length;
    const trial = profiles.filter(
      (p) => p.subscriptionStatus === "TRIAL",
    ).length;
    const expired = profiles.filter(
      (p) => p.subscriptionStatus === "EXPIRED" || !p.subscriptionStatus,
    ).length;
    const locked = profiles.filter((p) => p.accountStatus === "LOCKED").length;

    return { active, trial, expired, locked };
  }, [providerProfiles]);

  const handleLockUnlock = async (
    provider: ProviderProfile,
    action: "lock" | "unlock",
  ) => {
    try {
      await updateProviderMutation.mutateAsync({
        uid: provider.uid,
        updates: {
          accountStatus: action === "lock" ? "LOCKED" : "ACTIVE",
        },
      });

      // Update local state
      const updated = new Map(providerProfiles);
      const existing = updated.get(provider.uid);
      if (existing) {
        updated.set(provider.uid, {
          ...existing,
          accountStatus: action === "lock" ? "LOCKED" : "ACTIVE",
        });
        setProviderProfiles(updated);
      }

      toast({
        title: t("common.success"),
        description:
          action === "lock"
            ? t("admin.accountLocked")
            : t("admin.accountUnlocked"),
      });
      setLockDialog({ open: false, provider: null, action: null });
    } catch (error) {
      console.error("Failed to update account status:", error);
      toast({
        title: t("common.error"),
        description: t("admin.accountUpdateFailed"),
        variant: "destructive",
      });
    }
  };

  const handleVerifyPayment = async (
    provider: ProviderProfile,
    paymentDate: string,
    paymentAmount: string,
    paymentMethod: "BANK_TRANSFER" | "CARD" | "OTHER",
    notes: string,
  ) => {
    try {
      setIsUpdating(true);
      const amount =
        parseFloat(paymentAmount) || provider.subscriptionPrice || 10;
      const date = new Date(paymentDate);

      await verifySubscriptionPayment(provider.uid, {
        date,
        amount,
        method: paymentMethod,
        notes,
      });

      // Update local state
      const updated = new Map(providerProfiles);
      const existing = updated.get(provider.uid);
      if (existing) {
        const endDate = new Date(date);
        const months = monthsForPrice(existing.subscriptionPrice);
        endDate.setMonth(endDate.getMonth() + months);

        updated.set(provider.uid, {
          ...existing,
          subscriptionStatus: "ACTIVE",
          subscriptionStartDate: date,
          subscriptionEndDate: endDate,
          lastPaymentDate: date,
          lastSubscriptionPaymentDate: date,
          lastSubscriptionPaymentAmount: amount,
          lastSubscriptionPaymentMethod: paymentMethod,
          paymentVerificationStatus: "VERIFIED",
          paymentNotes: notes || "Payment verified by admin",
          accountStatus: "ACTIVE",
        });
        setProviderProfiles(updated);
      }

      toast({
        title: t("common.success"),
        description: t("admin.paymentVerified"),
      });
      setPaymentDialog({
        open: false,
        provider: null,
        notes: "",
        paymentDate: new Date().toISOString().split("T")[0],
        paymentAmount: "",
        paymentMethod: "BANK_TRANSFER",
      });
    } catch (error) {
      console.error("Failed to verify payment:", error);
      toast({
        title: t("common.error"),
        description: t("admin.paymentVerifyFailed"),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (
    provider: ProviderProfile,
    newStatus: "ACTIVE" | "EXPIRED" | "CANCELLED",
  ) => {
    try {
      setIsUpdating(true);
      await updateSubscriptionStatus(provider.uid, newStatus);

      // Update local state
      const updated = new Map(providerProfiles);
      const existing = updated.get(provider.uid);
      if (existing) {
        const updates: Partial<ProviderProfile> = {
          ...existing,
          subscriptionStatus: newStatus,
        };
        if (newStatus === "CANCELLED") {
          updates.cancellationDate = new Date();
        }
        updated.set(provider.uid, updates as ProviderProfile);
        setProviderProfiles(updated);
      }

      toast({
        title: t("common.success"),
        description: t("admin.statusUpdated", { status: newStatus }),
      });
      setStatusDialog({ open: false, provider: null });
    } catch (error) {
      console.error("Failed to update subscription status:", error);
      toast({
        title: t("common.error"),
        description: t("admin.statusUpdateFailed"),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGrantTrial = async (
    provider: ProviderProfile,
    trialDays: number,
  ) => {
    try {
      setIsUpdating(true);
      await grantTrialToProvider(provider.uid, trialDays);

      // Update local state
      const updated = new Map(providerProfiles);
      const existing = updated.get(provider.uid);
      if (existing) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + trialDays);
        updated.set(provider.uid, {
          ...existing,
          subscriptionStatus: "TRIAL",
          subscriptionStartDate: new Date(),
          subscriptionEndDate: endDate,
          isSubscribed: true,
        });
        setProviderProfiles(updated);
      }

      toast({
        title: t("common.success"),
        description: t("admin.trialGranted", { days: trialDays }),
      });
      setTrialDialog({ open: false, provider: null, trialDays: "14" });
    } catch (error) {
      console.error("Failed to grant trial:", error);
      toast({
        title: t("common.error"),
        description: t("admin.trialGrantFailed"),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return t("admin.notProvided");
    return new Date(date).toLocaleDateString();
  };

  const daysUntilExpiry = (endDate: Date | undefined) => {
    if (!endDate) return -1;
    const today = new Date();
    const end = new Date(endDate);
    const diff = Math.ceil(
      (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff;
  };

  const isLoading_ = isLoading || isLoadingProfiles;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="mb-6 text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
        {t("admin.subscriptions")}
      </h1>

      {/* Metrics Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.activeSubscriptions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.active}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.trialSubscriptions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{metrics.trial}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.expiredSubscriptions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {metrics.expired}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.lockedAccounts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {metrics.locked}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground ${isArabic ? "right-3" : "left-3"}`}
          />
          <Input
            placeholder={t("admin.searchProviders")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={isArabic ? "pr-10" : "pl-10"}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as "ALL" | "ACTIVE" | "EXPIRED" | "LOCKED")
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t("admin.filter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("common.all")}</SelectItem>
            <SelectItem value="ACTIVE">{t("admin.active")}</SelectItem>
            <SelectItem value="TRIAL">{t("admin.trial")}</SelectItem>
            <SelectItem value="EXPIRED">{t("admin.expired")}</SelectItem>
            <SelectItem value="LOCKED">{t("admin.locked")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subscriptions List */}
      <Card>
        <CardContent className="p-0">
          {isLoading_ ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {t("admin.noSubscriptions")}
            </div>
          ) : (
            <div className="divide-y">
              {filteredSubscriptions.map(({ user, profile }) => (
                <div
                  key={user.uid}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {user.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={
                            profile?.subscriptionStatus === "ACTIVE"
                              ? "default"
                              : profile?.subscriptionStatus === "EXPIRED"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {profile?.subscriptionStatus || "EXPIRED"}
                        </Badge>
                      </div>
                    </div>

                    {profile?.subscriptionEndDate && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {t("admin.expiresOn")}:{" "}
                          {formatDate(profile.subscriptionEndDate)}
                        </span>
                        {daysUntilExpiry(profile.subscriptionEndDate) <= 7 &&
                          daysUntilExpiry(profile.subscriptionEndDate) > 0 && (
                            <AlertCircle className="ml-2 h-4 w-4 text-amber-600" />
                          )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {profile?.subscriptionStatus === "ACTIVE" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs sm:text-sm"
                        onClick={() =>
                          setPaymentDialog({
                            open: true,
                            provider: profile,
                            notes: "",
                            paymentDate: new Date().toISOString().split("T")[0],
                            paymentAmount: "",
                            paymentMethod: "BANK_TRANSFER",
                          })
                        }
                      >
                        <CheckCircle
                          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isArabic ? "ml-1 sm:ml-2" : "mr-1 sm:mr-2"}`}
                        />
                        <span className="hidden xs:inline">
                          {t("admin.markPaidButton")}
                        </span>
                        <span className="xs:hidden">
                          {t("admin.markPaidButton")}
                        </span>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs sm:text-sm"
                      onClick={() =>
                        setStatusDialog({
                          open: true,
                          provider: profile,
                        })
                      }
                    >
                      <Edit2
                        className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isArabic ? "ml-1 sm:ml-2" : "mr-1 sm:mr-2"}`}
                      />
                      {t("admin.editStatus")}
                    </Button>

                    {/* Grant Trial button - show for non-TRIAL and non-ACTIVE providers */}
                    {profile?.subscriptionStatus !== "TRIAL" &&
                      profile?.subscriptionStatus !== "ACTIVE" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs sm:text-sm"
                          onClick={() =>
                            setTrialDialog({
                              open: true,
                              provider: profile,
                              trialDays: "14",
                            })
                          }
                        >
                          <Gift
                            className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isArabic ? "ml-1 sm:ml-2" : "mr-1 sm:mr-2"}`}
                          />
                          {t("admin.grantTrial")}
                        </Button>
                      )}

                    {profile?.accountStatus === "LOCKED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs sm:text-sm"
                        onClick={() =>
                          setLockDialog({
                            open: true,
                            provider: profile,
                            action: "unlock",
                          })
                        }
                      >
                        <Unlock
                          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isArabic ? "ml-1 sm:ml-2" : "mr-1 sm:mr-2"}`}
                        />
                        {t("admin.unlockAccount")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-xs sm:text-sm"
                        onClick={() =>
                          setLockDialog({
                            open: true,
                            provider: profile,
                            action: "lock",
                          })
                        }
                      >
                        <Lock
                          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isArabic ? "ml-1 sm:ml-2" : "mr-1 sm:mr-2"}`}
                        />
                        {t("admin.lockAccount")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lock/Unlock Dialog */}
      <Dialog
        open={lockDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setLockDialog({ open: false, provider: null, action: null });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lockDialog.action === "lock"
                ? t("admin.lockAccountTitle")
                : t("admin.unlockAccountTitle")}
            </DialogTitle>
            <DialogDescription>
              {lockDialog.provider?.displayName || lockDialog.provider?.uid}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {lockDialog.action === "lock"
              ? t("admin.lockAccountMessage")
              : t("admin.unlockAccountMessage")}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setLockDialog({ open: false, provider: null, action: null })
              }
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant={lockDialog.action === "lock" ? "destructive" : "default"}
              disabled={updateProviderMutation.isPending}
              onClick={() => {
                if (lockDialog.provider && lockDialog.action) {
                  handleLockUnlock(lockDialog.provider, lockDialog.action);
                }
              }}
            >
              {lockDialog.action === "lock"
                ? t("admin.lockAccount")
                : t("admin.unlockAccount")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog
        open={statusDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setStatusDialog({ open: false, provider: null });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.updateSubscriptionStatus")}</DialogTitle>
            <DialogDescription>
              {statusDialog.provider?.displayName || statusDialog.provider?.uid}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {(["ACTIVE", "EXPIRED", "CANCELLED"] as const).map((status) => (
                <Button
                  key={status}
                  variant={
                    statusDialog.provider?.subscriptionStatus === status
                      ? "default"
                      : "outline"
                  }
                  onClick={() => {
                    if (statusDialog.provider) {
                      handleUpdateStatus(statusDialog.provider, status);
                    }
                  }}
                  disabled={isUpdating}
                  className="text-xs sm:text-sm"
                >
                  {t(
                    `admin.status${status.charAt(0) + status.slice(1).toLowerCase()}`,
                  )}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Verification Dialog */}
      <Dialog
        open={paymentDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentDialog({
              open: false,
              provider: null,
              notes: "",
              paymentDate: new Date().toISOString().split("T")[0],
              paymentAmount: "",
              paymentMethod: "BANK_TRANSFER",
            });
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.verifySubscriptionPayment")}</DialogTitle>
            <DialogDescription>
              {paymentDialog.provider?.displayName ||
                paymentDialog.provider?.uid}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">{t("admin.currentPlan")}</Label>
              <p className="mt-1 text-sm font-medium">
                {paymentDialog.provider?.subscriptionPrice === 27
                  ? t("admin.planQuarterly")
                  : paymentDialog.provider?.subscriptionPrice === 96
                    ? t("admin.planYearly")
                    : t("admin.planMonthly")}
              </p>
            </div>

            <div>
              <Label htmlFor="paymentDate">{t("admin.paymentDate")}</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDialog.paymentDate}
                onChange={(e) =>
                  setPaymentDialog({
                    ...paymentDialog,
                    paymentDate: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="paymentAmount">{t("admin.amountReceived")}</Label>
              <Input
                id="paymentAmount"
                type="number"
                placeholder={`${paymentDialog.provider?.subscriptionPrice || 10}`}
                value={paymentDialog.paymentAmount}
                onChange={(e) =>
                  setPaymentDialog({
                    ...paymentDialog,
                    paymentAmount: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="paymentMethod">{t("admin.paymentMethod")}</Label>
              <Select
                value={paymentDialog.paymentMethod}
                onValueChange={(value) =>
                  setPaymentDialog({
                    ...paymentDialog,
                    paymentMethod: value as "BANK_TRANSFER" | "CARD" | "OTHER",
                  })
                }
              >
                <SelectTrigger id="paymentMethod" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">
                    {t("admin.bankTransfer")}
                  </SelectItem>
                  <SelectItem value="CARD">{t("admin.cardPayment")}</SelectItem>
                  <SelectItem value="OTHER">
                    {t("admin.otherPayment")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">{t("admin.adminNotes")}</Label>
              <Textarea
                id="notes"
                placeholder={t("admin.notesPlaceholder")}
                value={paymentDialog.notes}
                onChange={(e) =>
                  setPaymentDialog({
                    ...paymentDialog,
                    notes: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setPaymentDialog({
                  open: false,
                  provider: null,
                  notes: "",
                  paymentDate: new Date().toISOString().split("T")[0],
                  paymentAmount: "",
                  paymentMethod: "BANK_TRANSFER",
                })
              }
              disabled={isUpdating}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (
                  paymentDialog.provider &&
                  paymentDialog.paymentDate &&
                  paymentDialog.paymentAmount
                ) {
                  handleVerifyPayment(
                    paymentDialog.provider,
                    paymentDialog.paymentDate,
                    paymentDialog.paymentAmount,
                    paymentDialog.paymentMethod,
                    paymentDialog.notes,
                  );
                } else {
                  toast({
                    title: t("common.error"),
                    description: t("admin.fillRequiredFields"),
                    variant: "destructive",
                  });
                }
              }}
              disabled={isUpdating}
            >
              {t("admin.verifyPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Trial Dialog */}
      <Dialog
        open={trialDialog.open}
        onOpenChange={(open) => {
          if (!open)
            setTrialDialog({ open: false, provider: null, trialDays: "14" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.grantTrialTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.grantTrialDescription", {
                name: trialDialog.provider?.displayName || "Provider",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="trial-days">{t("admin.trialDays")}</Label>
            <Input
              id="trial-days"
              type="number"
              min="1"
              max="90"
              value={trialDialog.trialDays}
              onChange={(e) =>
                setTrialDialog({
                  ...trialDialog,
                  trialDays: e.target.value,
                })
              }
              className="mt-2"
            />
            <p className="mt-2 text-sm text-muted-foreground">
              {t("admin.trialDaysHint")}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setTrialDialog({ open: false, provider: null, trialDays: "14" })
              }
              disabled={isUpdating}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (
                  trialDialog.provider &&
                  parseInt(trialDialog.trialDays) > 0
                ) {
                  handleGrantTrial(
                    trialDialog.provider,
                    parseInt(trialDialog.trialDays),
                  );
                }
              }}
              disabled={isUpdating}
            >
              <Gift className={`h-4 w-4 ${isArabic ? "ml-2" : "mr-2"}`} />
              {t("admin.grantTrial")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminSubscriptionsPage;
