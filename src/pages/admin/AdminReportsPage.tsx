import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Flag,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReports, useUpdateReportStatus } from "@/hooks/queries/useReports";
import { useDeleteReview } from "@/hooks/queries/useReviews";
import { useAuth } from "@/contexts/AuthContext";
import { Report, ReportStatus } from "@/types";
import { toast } from "sonner";

const AdminReportsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isArabic = i18n.language === "ar";

  const [statusTab, setStatusTab] = useState<ReportStatus | "ALL">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: reports = [], isLoading } = useReports(
    statusTab === "ALL" ? undefined : (statusTab as ReportStatus),
  );
  const updateStatus = useUpdateReportStatus();
  const deleteReview = useDeleteReview();

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(
      (r) =>
        r.reason?.toLowerCase().includes(q) ||
        r.reporterName?.toLowerCase().includes(q) ||
        r.targetOwnerName?.toLowerCase().includes(q) ||
        r.targetContent?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q),
    );
  }, [reports, searchQuery]);

  const handleOpenDetail = (report: Report) => {
    setSelectedReport(report);
    setAdminNotes(report.adminNotes || "");
    setDetailOpen(true);
  };

  const handleResolve = async (status: "RESOLVED" | "DISMISSED") => {
    if (!selectedReport) return;
    try {
      await updateStatus.mutateAsync({
        reportId: selectedReport.id,
        status,
        adminNotes: adminNotes.trim() || undefined,
        resolvedBy: user?.uid,
      });
      toast.success(
        t(
          status === "RESOLVED"
            ? "adminReports.resolved"
            : "adminReports.dismissed",
        ),
      );
      setDetailOpen(false);
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleDeleteReviewContent = async () => {
    if (
      !selectedReport ||
      selectedReport.targetType !== "REVIEW" ||
      !selectedReport.targetId
    )
      return;
    try {
      await deleteReview.mutateAsync({
        reviewId: selectedReport.targetId,
        providerId: selectedReport.targetOwnerId || "",
        bookingId: "",
      });
      // Auto-resolve the report after deleting the content
      await updateStatus.mutateAsync({
        reportId: selectedReport.id,
        status: "RESOLVED" as ReportStatus,
        adminNotes:
          (adminNotes.trim() ? adminNotes.trim() + "\n" : "") +
          "[Content deleted by admin]",
        resolvedBy: user?.uid,
      });
      toast.success(t("adminReports.contentDeleted"));
      setDetailOpen(false);
    } catch (error) {
      console.error("Delete review error:", error);
      toast.error(t("common.error"));
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="h-3 w-3 me-1" />
            {t("adminReports.statusPending")}
          </Badge>
        );
      case "REVIEWED":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Eye className="h-3 w-3 me-1" />
            {t("adminReports.statusReviewed")}
          </Badge>
        );
      case "RESOLVED":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 me-1" />
            {t("adminReports.statusResolved")}
          </Badge>
        );
      case "DISMISSED":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            <XCircle className="h-3 w-3 me-1" />
            {t("adminReports.statusDismissed")}
          </Badge>
        );
    }
  };

  const getTargetTypeLabel = (type: string) => {
    return t(`adminReports.targetType.${type}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t("adminReports.title")}
        </h1>
        <p className="text-muted-foreground">{t("adminReports.subtitle")}</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("adminReports.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-9"
        />
      </div>

      {/* Status Tabs */}
      <Tabs
        value={statusTab}
        onValueChange={(v) => setStatusTab(v as ReportStatus | "ALL")}
      >
        <TabsList className="w-full">
          <TabsTrigger value="PENDING" className="flex-1">
            {t("adminReports.pending")}
          </TabsTrigger>
          <TabsTrigger value="REVIEWED" className="flex-1">
            {t("adminReports.reviewed")}
          </TabsTrigger>
          <TabsTrigger value="RESOLVED" className="flex-1">
            {t("adminReports.resolvedTab")}
          </TabsTrigger>
          <TabsTrigger value="ALL" className="flex-1">
            {t("common.all")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Reports List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Flag className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t("adminReports.noReports")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleOpenDetail(report)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getStatusBadge(report.status)}
                        <Badge variant="outline">
                          {getTargetTypeLabel(report.targetType)}
                        </Badge>
                      </div>
                      <p className="font-medium text-foreground">
                        {t(`report.reasons.${report.reason}`, {
                          defaultValue: report.reason,
                        })}
                      </p>
                      <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
                        <p>
                          {t("adminReports.reportedBy")}:{" "}
                          <span className="text-foreground">
                            {report.reporterName || report.reporterId}
                          </span>
                        </p>
                        {report.targetOwnerName && (
                          <p>
                            {t("adminReports.reportedUser")}:{" "}
                            <span className="text-foreground">
                              {report.targetOwnerName}
                            </span>
                          </p>
                        )}
                      </div>
                      {report.targetContent && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2 italic">
                          "{report.targetContent}"
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(report.createdAt).toLocaleDateString(
                          isArabic ? "ar-SA" : "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("adminReports.detailTitle")}</DialogTitle>
            <DialogDescription>
              {t("adminReports.detailDescription")}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 py-2">
              {/* Status */}
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedReport.status)}
                <Badge variant="outline">
                  {getTargetTypeLabel(selectedReport.targetType)}
                </Badge>
              </div>

              {/* Reporter Info */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  {t("adminReports.reportedBy")}
                </Label>
                <p className="font-medium">
                  {selectedReport.reporterName || selectedReport.reporterId}
                </p>
              </div>

              {/* Target Owner Info */}
              {selectedReport.targetOwnerName && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t("adminReports.reportedUser")}
                  </Label>
                  <p className="font-medium">
                    {selectedReport.targetOwnerName}
                  </p>
                </div>
              )}

              {/* Reason */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  {t("report.reason")}
                </Label>
                <p className="font-medium">
                  {t(`report.reasons.${selectedReport.reason}`, {
                    defaultValue: selectedReport.reason,
                  })}
                </p>
              </div>

              {/* Description */}
              {selectedReport.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t("report.details")}
                  </Label>
                  <p className="text-sm">{selectedReport.description}</p>
                </div>
              )}

              {/* Reported Content */}
              {selectedReport.targetContent && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t("adminReports.reportedContent")}
                  </Label>
                  <div className="mt-1 rounded-lg bg-muted p-3">
                    <p className="text-sm italic">
                      "{selectedReport.targetContent}"
                    </p>
                  </div>
                </div>
              )}

              {/* Date */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  {t("adminReports.date")}
                </Label>
                <p className="text-sm">
                  {new Date(selectedReport.createdAt).toLocaleString(
                    isArabic ? "ar-SA" : "en-US",
                  )}
                </p>
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label>{t("adminReports.adminNotes")}</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={t("adminReports.adminNotesPlaceholder")}
                  rows={3}
                  disabled={
                    selectedReport.status === "RESOLVED" ||
                    selectedReport.status === "DISMISSED"
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedReport &&
              selectedReport.status !== "RESOLVED" &&
              selectedReport.status !== "DISMISSED" && (
                <>
                  {/* Delete content (for review reports) */}
                  {selectedReport.targetType === "REVIEW" && (
                    <Button
                      variant="destructive"
                      onClick={handleDeleteReviewContent}
                      disabled={
                        deleteReview.isPending || updateStatus.isPending
                      }
                      className="w-full sm:w-auto"
                    >
                      {deleteReview.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      {t("adminReports.deleteContent")}
                    </Button>
                  )}

                  <div className="flex gap-2 w-full sm:w-auto sm:ms-auto">
                    <Button
                      variant="outline"
                      onClick={() => handleResolve("DISMISSED")}
                      disabled={updateStatus.isPending}
                      className="flex-1 sm:flex-none"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {t("adminReports.dismiss")}
                    </Button>
                    <Button
                      onClick={() => handleResolve("RESOLVED")}
                      disabled={updateStatus.isPending}
                      className="flex-1 sm:flex-none"
                    >
                      {updateStatus.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      {t("adminReports.resolve")}
                    </Button>
                  </div>
                </>
              )}

            {selectedReport &&
              (selectedReport.status === "RESOLVED" ||
                selectedReport.status === "DISMISSED") && (
                <p className="text-sm text-muted-foreground">
                  {t("adminReports.alreadyHandled")}
                </p>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReportsPage;
