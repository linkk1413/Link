import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Search,
  Landmark,
  Copy,
  AlertTriangle,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  usePayouts,
  useProcessPayout,
  PayoutWithProvider,
} from "@/hooks/queries/usePayouts";
import { PayoutStatus } from "@/types";

const AdminPayoutsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [activeTab, setActiveTab] = useState("requested");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayout, setSelectedPayout] =
    useState<PayoutWithProvider | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<
    "approve" | "reject" | "paid" | null
  >(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch payouts
  const { data: payouts = [], isLoading } = usePayouts();
  const processMutation = useProcessPayout();

  // Filter by status and search
  const filterPayouts = (status: PayoutStatus) => {
    return payouts.filter((p) => {
      const matchesStatus = p.status === status;
      const matchesSearch =
        !searchQuery ||
        p.providerName?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  };

  const requestedPayouts = filterPayouts("REQUESTED");
  const approvedPayouts = filterPayouts("APPROVED");
  const paidPayouts = filterPayouts("PAID");
  const rejectedPayouts = filterPayouts("REJECTED");

  const handleAction = (
    payout: PayoutWithProvider,
    action: "approve" | "reject" | "paid",
  ) => {
    setSelectedPayout(payout);
    setActionType(action);
    setRejectionReason("");
    setActionDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedPayout || !actionType) return;

    const statusMap: Record<string, PayoutStatus> = {
      approve: "APPROVED",
      reject: "REJECTED",
      paid: "PAID",
    };

    try {
      await processMutation.mutateAsync({
        payoutId: selectedPayout.id,
        status: statusMap[actionType],
        reason: actionType === "reject" ? rejectionReason : undefined,
      });
      setActionDialogOpen(false);
      setSelectedPayout(null);
      setActionType(null);
    } catch (error) {
      console.error("Failed to process payout:", error);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} SAR`;
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("admin.copied", { field: label }));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  /**
   * The bank details the admin needs to actually send the money. Providers fill
   * these in on their profile; if they are missing the payout can't be paid, so
   * we say so instead of showing an empty box.
   */
  const renderBankDetails = (payout: PayoutWithProvider) => {
    const fields = [
      {
        key: "accountHolder",
        label: t("profile.accountHolder"),
        value: payout.bankAccountHolder,
      },
      { key: "bankName", label: t("profile.bankName"), value: payout.bankName },
      {
        key: "accountNumber",
        label: t("profile.accountNumber"),
        value: payout.bankAccountNumber,
      },
      { key: "iban", label: t("profile.iban"), value: payout.bankIBAN },
    ].filter((field) => !!field.value?.trim());

    if (fields.length === 0) {
      return (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm">{t("admin.noBankDetails")}</p>
        </div>
      );
    }

    return (
      <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <Landmark className="h-4 w-4 text-primary" />
          {t("profile.bankAccount")}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{field.label}</p>
                <p dir="ltr" className="truncate text-sm font-medium text-foreground">
                  {field.value}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => copyToClipboard(field.value!, field.label)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {(payout.providerEmail || payout.providerPhone) && (
          <div className="mt-3 flex flex-wrap gap-4 border-t border-border pt-2 text-xs text-muted-foreground">
            {payout.providerEmail && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                <span dir="ltr">{payout.providerEmail}</span>
              </span>
            )}
            {payout.providerPhone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                <span dir="ltr">{payout.providerPhone}</span>
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPayoutList = (
    payoutList: PayoutWithProvider[],
    showActions: boolean = false,
  ) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      );
    }

    if (payoutList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-12 text-center">
          <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">{t("admin.noPayouts")}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {payoutList.map((payout) => (
          <div key={payout.id} className="rounded-xl bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src="" />
                <AvatarFallback>
                  {(payout.providerName || "P").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div>
                <h3 className="font-semibold text-foreground">
                  {payout.providerName || t("admin.provider")}
                </h3>
                <div className="flex items-center gap-2 text-lg font-bold text-primary">
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(payout.amount)}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(payout.createdAt)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {payout.status === "REQUESTED" && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleAction(payout, "approve")}
                  >
                    <CheckCircle className="me-1 h-4 w-4" />
                    {t("admin.approve")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAction(payout, "reject")}
                  >
                    <XCircle className="me-1 h-4 w-4" />
                    {t("admin.reject")}
                  </Button>
                </>
              )}

              {payout.status === "APPROVED" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleAction(payout, "paid")}
                >
                  <CreditCard className="me-1 h-4 w-4" />
                  {t("admin.markPaid")}
                </Button>
              )}

              {payout.status === "PAID" && (
                <Badge variant="default" className="bg-green-500">
                  {t("wallet.paid")}
                </Badge>
              )}

              {payout.status === "REJECTED" && (
                <Badge variant="destructive">{t("wallet.rejected")}</Badge>
              )}
            </div>
            </div>

            {/* Bank details — hidden for rejected payouts, which are never paid */}
            {payout.status !== "REJECTED" && renderBankDetails(payout)}
          </div>
        ))}
      </div>
    );
  };

  // Calculate totals
  const totalRequested = requestedPayouts.reduce((sum, p) => sum + p.amount, 0);
  const totalApproved = approvedPayouts.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      >
        {/* Header */}
        <motion.div variants={fadeInUp} className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {t("admin.payoutsManagement")}
          </h1>
          <p className="text-muted-foreground">
            {t("admin.payoutsDescription")}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={fadeInUp}
          className="mb-6 grid gap-4 md:grid-cols-2"
        >
          <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {t("admin.pendingPayouts")}
            </p>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
              {formatCurrency(totalRequested)}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {requestedPayouts.length} {t("admin.requests")}
            </p>
          </div>

          <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {t("admin.approvedPending")}
            </p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {formatCurrency(totalApproved)}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {approvedPayouts.length} {t("admin.awaitingPayment")}
            </p>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div variants={fadeInUp} className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("admin.searchProvider")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={fadeInUp}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="requested" className="gap-2">
                <Clock className="h-4 w-4" />
                {t("wallet.requested")}
                {requestedPayouts.length > 0 && (
                  <Badge variant="secondary" className="ms-1">
                    {requestedPayouts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                {t("wallet.approved")}
              </TabsTrigger>
              <TabsTrigger value="paid" className="gap-2">
                <CreditCard className="h-4 w-4" />
                {t("wallet.paid")}
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2">
                <XCircle className="h-4 w-4" />
                {t("wallet.rejected")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requested">
              {renderPayoutList(requestedPayouts, true)}
            </TabsContent>

            <TabsContent value="approved">
              {renderPayoutList(approvedPayouts, true)}
            </TabsContent>

            <TabsContent value="paid">
              {renderPayoutList(paidPayouts)}
            </TabsContent>

            <TabsContent value="rejected">
              {renderPayoutList(rejectedPayouts)}
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve"
                ? t("admin.approvePayoutTitle")
                : actionType === "paid"
                  ? t("admin.markPaidTitle")
                  : t("admin.rejectPayoutTitle")}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? t("admin.approvePayoutDescription", {
                    amount: formatCurrency(selectedPayout?.amount || 0),
                  })
                : actionType === "paid"
                  ? t("admin.markPaidDescription", {
                      amount: formatCurrency(selectedPayout?.amount || 0),
                    })
                  : t("admin.rejectPayoutDescription", {
                      amount: formatCurrency(selectedPayout?.amount || 0),
                    })}
            </DialogDescription>
          </DialogHeader>

          {actionType === "reject" && (
            <div className="py-4">
              <Label htmlFor="reason">{t("admin.rejectionReason")}</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t("admin.payoutRejectionPlaceholder")}
                className="mt-1"
                rows={3}
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setActionDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant={actionType === "reject" ? "destructive" : "default"}
              onClick={confirmAction}
              disabled={processMutation.isPending}
            >
              {actionType === "approve"
                ? t("admin.approve")
                : actionType === "paid"
                  ? t("admin.markPaid")
                  : t("admin.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayoutsPage;
