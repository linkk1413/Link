import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Lock, Unlock, Edit2, CheckCircle, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useUpdateProviderProfile, providerKeys } from "@/hooks/queries/useProviders";
import {
  verifySubscriptionPayment,
  updateSubscriptionStatus,
  grantTrialToProvider,
} from "@/lib/firestore";
import { ProviderProfile } from "@/types";

const toDateInputValue = (date?: Date) =>
  date ? new Date(date).toISOString().split("T")[0] : "";

interface SubscriptionActionsProps {
  provider: ProviderProfile;
}

// The one place subscription actions (lock/unlock, activate/extend/edit
// dates, record payment, grant trial) live — used by both AdminSubscriptionsPage
// (subscription monitoring list) and AdminUserDetailPage (single source of
// truth for managing one account), so there's exactly one implementation to
// keep in sync instead of two drifting copies.
export const SubscriptionActions: React.FC<SubscriptionActionsProps> = ({
  provider,
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const queryClient = useQueryClient();
  const updateProviderMutation = useUpdateProviderProfile();

  const [isUpdating, setIsUpdating] = useState(false);
  const [lockDialog, setLockDialog] = useState<"lock" | "unlock" | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({
    startDate: toDateInputValue(provider.subscriptionStartDate),
    endDate: toDateInputValue(provider.subscriptionEndDate),
  });
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    method: "BANK_TRANSFER" as "BANK_TRANSFER" | "CARD" | "OTHER",
    notes: "",
  });
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [trialDays, setTrialDays] = useState("14");

  const invalidateProvider = () =>
    queryClient.invalidateQueries({ queryKey: providerKeys.detail(provider.uid) });

  const handleLockUnlock = async (action: "lock" | "unlock") => {
    try {
      await updateProviderMutation.mutateAsync({
        uid: provider.uid,
        updates: { accountStatus: action === "lock" ? "LOCKED" : "ACTIVE" },
      });
      toast.success(
        action === "lock" ? t("admin.accountLocked") : t("admin.accountUnlocked"),
      );
      setLockDialog(null);
    } catch (error) {
      console.error("Failed to update account status:", error);
      toast.error(t("admin.accountUpdateFailed"));
    }
  };

  const handleVerifyPayment = async () => {
    if (!paymentForm.date || !paymentForm.amount) {
      toast.error(t("admin.fillRequiredFields"));
      return;
    }
    try {
      setIsUpdating(true);
      const amount = parseFloat(paymentForm.amount) || provider.subscriptionPrice || 10;
      const date = new Date(paymentForm.date);
      await verifySubscriptionPayment(provider.uid, {
        date,
        amount,
        method: paymentForm.method,
        notes: paymentForm.notes,
      });
      invalidateProvider();
      toast.success(t("admin.paymentVerified"));
      setPaymentDialogOpen(false);
      setPaymentForm({
        date: new Date().toISOString().split("T")[0],
        amount: "",
        method: "BANK_TRANSFER",
        notes: "",
      });
    } catch (error) {
      console.error("Failed to verify payment:", error);
      toast.error(t("admin.paymentVerifyFailed"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (
    newStatus: "ACTIVE" | "EXPIRED" | "CANCELLED",
  ) => {
    try {
      setIsUpdating(true);
      await updateSubscriptionStatus(
        provider.uid,
        newStatus,
        statusForm.startDate ? new Date(statusForm.startDate) : undefined,
        statusForm.endDate ? new Date(statusForm.endDate) : undefined,
      );
      invalidateProvider();
      toast.success(t("admin.statusUpdated", { status: newStatus }));
      setStatusDialogOpen(false);
    } catch (error) {
      console.error("Failed to update subscription status:", error);
      toast.error(t("admin.statusUpdateFailed"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGrantTrial = async () => {
    const days = parseInt(trialDays, 10);
    if (!days || days <= 0) return;
    try {
      setIsUpdating(true);
      await grantTrialToProvider(provider.uid, days);
      invalidateProvider();
      toast.success(t("admin.trialGranted", { days }));
      setTrialDialogOpen(false);
      setTrialDays("14");
    } catch (error) {
      console.error("Failed to grant trial:", error);
      toast.error(t("admin.trialGrantFailed"));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {provider.subscriptionStatus === "ACTIVE" && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs sm:text-sm"
            onClick={() => setPaymentDialogOpen(true)}
          >
            <CheckCircle className={isArabic ? "ms-1 h-3.5 w-3.5 sm:h-4 sm:w-4" : "me-1 h-3.5 w-3.5 sm:h-4 sm:w-4"} />
            {t("admin.markPaidButton")}
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          className="text-xs sm:text-sm"
          onClick={() => {
            setStatusForm({
              startDate: toDateInputValue(provider.subscriptionStartDate),
              endDate: toDateInputValue(provider.subscriptionEndDate),
            });
            setStatusDialogOpen(true);
          }}
        >
          <Edit2 className={isArabic ? "ms-1 h-3.5 w-3.5 sm:h-4 sm:w-4" : "me-1 h-3.5 w-3.5 sm:h-4 sm:w-4"} />
          {t("admin.editStatus")}
        </Button>

        {provider.subscriptionStatus !== "TRIAL" &&
          provider.subscriptionStatus !== "ACTIVE" && (
            <Button
              size="sm"
              variant="secondary"
              className="text-xs sm:text-sm"
              onClick={() => setTrialDialogOpen(true)}
            >
              <Gift className={isArabic ? "ms-1 h-3.5 w-3.5 sm:h-4 sm:w-4" : "me-1 h-3.5 w-3.5 sm:h-4 sm:w-4"} />
              {t("admin.grantTrial")}
            </Button>
          )}

        {provider.accountStatus === "LOCKED" ? (
          <Button
            size="sm"
            variant="outline"
            className="text-xs sm:text-sm"
            onClick={() => setLockDialog("unlock")}
          >
            <Unlock className={isArabic ? "ms-1 h-3.5 w-3.5 sm:h-4 sm:w-4" : "me-1 h-3.5 w-3.5 sm:h-4 sm:w-4"} />
            {t("admin.unlockAccount")}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            className="text-xs sm:text-sm"
            onClick={() => setLockDialog("lock")}
          >
            <Lock className={isArabic ? "ms-1 h-3.5 w-3.5 sm:h-4 sm:w-4" : "me-1 h-3.5 w-3.5 sm:h-4 sm:w-4"} />
            {t("admin.lockAccount")}
          </Button>
        )}
      </div>

      {/* Lock/Unlock Dialog */}
      <Dialog open={lockDialog !== null} onOpenChange={(open) => !open && setLockDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lockDialog === "lock"
                ? t("admin.lockAccountTitle")
                : t("admin.unlockAccountTitle")}
            </DialogTitle>
            <DialogDescription>
              {provider.displayName || provider.uid}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {lockDialog === "lock"
              ? t("admin.lockAccountMessage")
              : t("admin.unlockAccountMessage")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockDialog(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={lockDialog === "lock" ? "destructive" : "default"}
              disabled={updateProviderMutation.isPending}
              onClick={() => lockDialog && handleLockUnlock(lockDialog)}
            >
              {lockDialog === "lock" ? t("admin.lockAccount") : t("admin.unlockAccount")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status + dates dialog — covers activate / extend / edit dates / cancel */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.updateSubscriptionStatus")}</DialogTitle>
            <DialogDescription>
              {provider.displayName || provider.uid}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sub-start-date">{t("admin.subscriptionStartDate")}</Label>
                <Input
                  id="sub-start-date"
                  type="date"
                  value={statusForm.startDate}
                  onChange={(e) =>
                    setStatusForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sub-end-date">{t("admin.subscriptionEndDate")}</Label>
                <Input
                  id="sub-end-date"
                  type="date"
                  value={statusForm.endDate}
                  onChange={(e) =>
                    setStatusForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("admin.extendHint")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["ACTIVE", "EXPIRED", "CANCELLED"] as const).map((status) => (
                <Button
                  key={status}
                  variant={provider.subscriptionStatus === status ? "default" : "outline"}
                  onClick={() => handleUpdateStatus(status)}
                  disabled={isUpdating}
                  className="text-xs sm:text-sm"
                >
                  {t(`admin.status${status.charAt(0) + status.slice(1).toLowerCase()}`)}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Verification Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.verifySubscriptionPayment")}</DialogTitle>
            <DialogDescription>
              {provider.displayName || provider.uid}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">{t("admin.currentPlan")}</Label>
              <p className="mt-1 text-sm font-medium">
                {provider.subscriptionPrice === 27
                  ? t("admin.planQuarterly")
                  : provider.subscriptionPrice === 96
                    ? t("admin.planYearly")
                    : t("admin.planMonthly")}
              </p>
            </div>
            <div>
              <Label htmlFor="paymentDate">{t("admin.paymentDate")}</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentForm.date}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="paymentAmount">{t("admin.amountReceived")}</Label>
              <Input
                id="paymentAmount"
                type="number"
                placeholder={`${provider.subscriptionPrice || 10}`}
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="paymentMethod">{t("admin.paymentMethod")}</Label>
              <Select
                value={paymentForm.method}
                onValueChange={(value) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    method: value as "BANK_TRANSFER" | "CARD" | "OTHER",
                  }))
                }
              >
                <SelectTrigger id="paymentMethod" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">{t("admin.bankTransfer")}</SelectItem>
                  <SelectItem value="CARD">{t("admin.cardPayment")}</SelectItem>
                  <SelectItem value="OTHER">{t("admin.otherPayment")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">{t("admin.adminNotes")}</Label>
              <Textarea
                id="notes"
                placeholder={t("admin.notesPlaceholder")}
                value={paymentForm.notes}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={isUpdating}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleVerifyPayment} disabled={isUpdating}>
              {t("admin.verifyPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Trial Dialog */}
      <Dialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.grantTrialTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.grantTrialDescription", {
                name: provider.displayName || "Provider",
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
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="mt-2"
            />
            <p className="mt-2 text-sm text-muted-foreground">{t("admin.trialDaysHint")}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTrialDialogOpen(false)}
              disabled={isUpdating}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleGrantTrial} disabled={isUpdating}>
              <Gift className={isArabic ? "ms-2 h-4 w-4" : "me-2 h-4 w-4"} />
              {t("admin.grantTrial")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriptionActions;
