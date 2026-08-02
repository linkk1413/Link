import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logAdminAction } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";

interface VerificationRequest {
  id: string;
  providerId: string;
  providerName: string;
  providerEmail: string;
  submittedAt: Date;
  documents: { name: string; url: string }[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason?: string;
}

const AdminVerificationsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { user } = useAuth();

  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedRequest, setSelectedRequest] =
    useState<VerificationRequest | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<
    "approve" | "reject" | null
  >(null);
  const [bulkRejectionReason, setBulkRejectionReason] = useState("");
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Fetch verifications from Firestore
  useEffect(() => {
    const fetchVerifications = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "verifications"),
          orderBy("submittedAt", "desc"),
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          submittedAt: doc.data().submittedAt?.toDate?.() || new Date(),
        })) as VerificationRequest[];
        setVerifications(data);
      } catch (error) {
        console.error("Failed to fetch verifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVerifications();
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab]);

  // Filter by status
  const pendingRequests = verifications.filter((v) => v.status === "PENDING");
  const approvedRequests = verifications.filter((v) => v.status === "APPROVED");
  const rejectedRequests = verifications.filter((v) => v.status === "REJECTED");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPending = () => {
    setSelectedIds((prev) =>
      prev.size === pendingRequests.length
        ? new Set()
        : new Set(pendingRequests.map((r) => r.id)),
    );
  };

  const handleView = (request: VerificationRequest) => {
    setSelectedRequest(request);
    setViewDialogOpen(true);
  };

  const handleAction = (
    request: VerificationRequest,
    action: "approve" | "reject",
  ) => {
    setSelectedRequest(request);
    setActionType(action);
    setRejectionReason("");
    setActionDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedRequest || !actionType) return;

    try {
      setIsProcessing(true);

      // Update verification status
      const verificationRef = doc(db, "verifications", selectedRequest.id);
      const updateData: Record<string, unknown> = {
        status: actionType === "approve" ? "APPROVED" : "REJECTED",
        updatedAt: new Date(),
        updatedBy: user?.uid,
      };

      if (actionType === "reject") {
        updateData.reason = rejectionReason;
      }

      await updateDoc(verificationRef, updateData);

      // If approved, update provider's identityVerified flag (allows adding services)
      if (actionType === "approve") {
        const providerRef = doc(db, "providers", selectedRequest.providerId);
        await updateDoc(providerRef, {
          identityVerified: true,
          identityVerifiedAt: new Date(),
        });
      }

      // Update local state
      setVerifications((prev) =>
        prev.map((v) =>
          v.id === selectedRequest.id
            ? {
                ...v,
                status: actionType === "approve" ? "APPROVED" : "REJECTED",
                reason: actionType === "reject" ? rejectionReason : undefined,
              }
            : v,
        ),
      );

      logAdminAction({
        actorId: user?.uid || "",
        actorName: user?.name || user?.displayName,
        action:
          actionType === "approve"
            ? "VERIFICATION_APPROVED"
            : "VERIFICATION_REJECTED",
        targetType: "VERIFICATION",
        targetId: selectedRequest.id,
        targetLabel: selectedRequest.providerName,
        details: actionType === "reject" ? rejectionReason : undefined,
      });

      setActionDialogOpen(false);
      setSelectedRequest(null);
      setActionType(null);
    } catch (error) {
      console.error("Failed to process verification:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const openBulkAction = (action: "approve" | "reject") => {
    setBulkActionType(action);
    setBulkRejectionReason("");
    setBulkDialogOpen(true);
  };

  const confirmBulkAction = async () => {
    if (!bulkActionType || selectedIds.size === 0) return;

    const targets = pendingRequests.filter((r) => selectedIds.has(r.id));

    try {
      setIsBulkProcessing(true);

      await Promise.all(
        targets.map(async (request) => {
          const verificationRef = doc(db, "verifications", request.id);
          const updateData: Record<string, unknown> = {
            status: bulkActionType === "approve" ? "APPROVED" : "REJECTED",
            updatedAt: new Date(),
            updatedBy: user?.uid,
          };
          if (bulkActionType === "reject") {
            updateData.reason = bulkRejectionReason;
          }
          await updateDoc(verificationRef, updateData);

          if (bulkActionType === "approve") {
            const providerRef = doc(db, "providers", request.providerId);
            await updateDoc(providerRef, {
              identityVerified: true,
              identityVerifiedAt: new Date(),
            });
          }
        }),
      );

      const targetIds = new Set(targets.map((r) => r.id));
      setVerifications((prev) =>
        prev.map((v) =>
          targetIds.has(v.id)
            ? {
                ...v,
                status: bulkActionType === "approve" ? "APPROVED" : "REJECTED",
                reason:
                  bulkActionType === "reject" ? bulkRejectionReason : undefined,
              }
            : v,
        ),
      );

      logAdminAction({
        actorId: user?.uid || "",
        actorName: user?.name || user?.displayName,
        action:
          bulkActionType === "approve"
            ? "VERIFICATION_APPROVED"
            : "VERIFICATION_REJECTED",
        targetType: "VERIFICATION",
        targetLabel: `${targets.length} providers`,
        details: targets
          .map((r) => r.providerName)
          .join(", ")
          .slice(0, 500),
      });

      setSelectedIds(new Set());
      setBulkDialogOpen(false);
      setBulkActionType(null);
    } catch (error) {
      console.error("Failed to process bulk verification action:", error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderRequestList = (
    requests: VerificationRequest[],
    selectable = false,
  ) => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      );
    }

    if (requests.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-12 text-center">
          <ShieldCheck className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">{t("admin.noVerifications")}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between rounded-xl bg-card p-4"
          >
            <div className="flex items-center gap-4">
              {selectable && (
                <Checkbox
                  checked={selectedIds.has(request.id)}
                  onCheckedChange={() => toggleSelect(request.id)}
                  aria-label={t("admin.selectRow")}
                />
              )}
              <Avatar className="h-12 w-12">
                <AvatarImage src="" />
                <AvatarFallback>
                  {request.providerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div>
                <h3 className="font-semibold text-foreground">
                  {request.providerName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {request.providerEmail}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(request.submittedAt)}
                  <span>•</span>
                  <FileText className="h-3 w-3" />
                  {request.documents.length} {t("admin.documents")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleView(request)}
              >
                <Eye className="me-1 h-4 w-4" />
                {t("admin.view")}
              </Button>

              {request.status === "PENDING" && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleAction(request, "approve")}
                  >
                    <CheckCircle className="me-1 h-4 w-4" />
                    {t("admin.approve")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAction(request, "reject")}
                  >
                    <XCircle className="me-1 h-4 w-4" />
                    {t("admin.reject")}
                  </Button>
                </>
              )}

              {request.status === "APPROVED" && (
                <Badge variant="default" className="bg-green-500">
                  {t("admin.approved")}
                </Badge>
              )}

              {request.status === "REJECTED" && (
                <Badge variant="destructive">{t("admin.rejected")}</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {t("admin.verifications")}
          </h1>
          <p className="text-muted-foreground">
            {t("admin.verificationsDescription")}
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              {t("admin.pending")}
              {pendingRequests.length > 0 && (
                <Badge variant="secondary" className="ms-1">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              {t("admin.approved")}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="h-4 w-4" />
              {t("admin.rejected")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {!loading && pendingRequests.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 p-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={
                      selectedIds.size > 0 &&
                      selectedIds.size === pendingRequests.length
                    }
                    onCheckedChange={toggleSelectAllPending}
                  />
                  {selectedIds.size > 0
                    ? t("admin.selectedCount", { count: selectedIds.size })
                    : t("admin.selectAll")}
                </label>

                {selectedIds.size > 0 && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => openBulkAction("approve")}
                    >
                      <CheckCircle className="me-1 h-4 w-4" />
                      {t("admin.bulkApprove")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openBulkAction("reject")}
                    >
                      <XCircle className="me-1 h-4 w-4" />
                      {t("admin.bulkReject")}
                    </Button>
                  </div>
                )}
              </div>
            )}
            {renderRequestList(pendingRequests, true)}
          </TabsContent>

          <TabsContent value="approved">
            {renderRequestList(approvedRequests)}
          </TabsContent>

          <TabsContent value="rejected">
            {renderRequestList(rejectedRequests)}
          </TabsContent>
        </Tabs>
      </div>

      {/* View Documents Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("admin.viewDocuments")}</DialogTitle>
            <DialogDescription>
              {t("admin.documentsFor", { name: selectedRequest?.providerName })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedRequest?.documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-foreground">{doc.name}</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                    {t("admin.view")}
                  </a>
                </Button>
              </div>
            ))}

            {(!selectedRequest?.documents ||
              selectedRequest.documents.length === 0) && (
              <p className="text-center text-muted-foreground">
                {t("admin.noDocumentsUploaded")}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              {t("common.done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve"
                ? t("admin.approveTitle")
                : t("admin.rejectTitle")}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? t("admin.approveDescription", {
                    name: selectedRequest?.providerName,
                  })
                : t("admin.rejectDescription", {
                    name: selectedRequest?.providerName,
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
                placeholder={t("admin.rejectionReasonPlaceholder")}
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
              disabled={isProcessing}
            >
              {actionType === "approve"
                ? t("admin.approve")
                : t("admin.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkActionType === "approve"
                ? t("admin.bulkApproveTitle")
                : t("admin.bulkRejectTitle")}
            </DialogTitle>
            <DialogDescription>
              {bulkActionType === "approve"
                ? t("admin.bulkApproveDescription", { count: selectedIds.size })
                : t("admin.bulkRejectDescription", { count: selectedIds.size })}
            </DialogDescription>
          </DialogHeader>

          {bulkActionType === "reject" && (
            <div className="py-4">
              <Label htmlFor="bulk-reason">{t("admin.rejectionReason")}</Label>
              <Textarea
                id="bulk-reason"
                value={bulkRejectionReason}
                onChange={(e) => setBulkRejectionReason(e.target.value)}
                placeholder={t("admin.rejectionReasonPlaceholder")}
                className="mt-1"
                rows={3}
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={bulkActionType === "reject" ? "destructive" : "default"}
              onClick={confirmBulkAction}
              disabled={isBulkProcessing}
            >
              {bulkActionType === "approve"
                ? t("admin.bulkApprove")
                : t("admin.bulkReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVerificationsPage;
