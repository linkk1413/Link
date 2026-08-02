import React, { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ArrowLeft,
  Ban,
  UserX,
  Trash2,
  Loader2,
  RotateCcw,
  ImageOff,
  Phone,
  Mail,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ReportActivityFeed } from "@/components/ReportActivityFeed";
import {
  useReportLive,
  useReportActivityLive,
  useSendReportMessage,
  useUpdateReportStatus,
  useReportInternalNotes,
  useAddReportInternalNote,
  useDeleteReport,
} from "@/hooks/queries/useReports";
import {
  useDeleteReview,
  useDeleteReviewReply,
  useReviewById,
} from "@/hooks/queries/useReviews";
import { useUpdateUserStatus, useDeleteUserAccount } from "@/hooks/queries/useUsers";
import { useChat, useChatMessages, useDeleteMessage } from "@/hooks/queries/useChats";
import { useService } from "@/hooks/queries/useServices";
import { useBooking } from "@/hooks/queries/useBookings";
import { logAdminAction } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { ReportStatus } from "@/types";
import { toast } from "sonner";

const TERMINAL_STATUSES: ReportStatus[] = ["RESOLVED", "REJECTED", "CLOSED"];
const ALL_STATUSES: ReportStatus[] = [
  "NEW",
  "UNDER_REVIEW",
  "AWAITING_CLIENT_REPLY",
  "AWAITING_PROVIDER_REPLY",
  "RESOLVED",
  "REJECTED",
  "CLOSED",
];

const QUICK_REPLIES = [
  "received",
  "reviewing",
  "needMoreInfo",
  "resolved",
  "closed",
  "contactUs",
] as const;

// Legacy reports predate this status set — display them under their closest
// modern equivalent without ever writing the old value back.
const normalizeStatus = (status: ReportStatus): ReportStatus => {
  if (status === "PENDING") return "NEW";
  if (status === "REVIEWED") return "UNDER_REVIEW";
  if (status === "DISMISSED") return "REJECTED";
  return status;
};

const AdminReportDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const isRTL = isArabic;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id = "" } = useParams<{ id: string }>();

  const [noteText, setNoteText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [suspendConfirmOpen, setSuspendConfirmOpen] = useState(false);
  const [deleteUserConfirmOpen, setDeleteUserConfirmOpen] = useState(false);
  const [deleteReportConfirmOpen, setDeleteReportConfirmOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const { data: report, isLoading } = useReportLive(id);
  const { data: activity = [] } = useReportActivityLive(id);
  const { data: notes = [] } = useReportInternalNotes(id);
  const updateStatus = useUpdateReportStatus();
  const addNote = useAddReportInternalNote();
  const sendMessage = useSendReportMessage();
  const deleteReportMutation = useDeleteReport();
  const suspendUser = useUpdateUserStatus();
  const deleteUserAccount = useDeleteUserAccount();
  const deleteReview = useDeleteReview();
  const deleteReply = useDeleteReviewReply();
  const deleteMessageMutation = useDeleteMessage();

  const reportedReviewId = report?.targetType === "REVIEW" ? report.targetId : "";
  const { data: reportedReview } = useReviewById(reportedReviewId);

  const relatedBookingId =
    report?.targetType === "BOOKING" ? report.targetId : report?.bookingId || reportedReview?.bookingId;
  const relatedServiceId = report?.serviceId || reportedReview?.serviceId;

  const { data: relatedBooking } = useBooking(relatedBookingId || "");
  const { data: relatedService } = useService(relatedServiceId || "");
  const { data: linkedChat } = useChat(report?.chatId || "");
  const { data: chatMessages = [] } = useChatMessages(report?.chatId || "");

  const status = report ? normalizeStatus(report.status) : "NEW";
  const isTerminal = TERMINAL_STATUSES.includes(status);

  const formatDate = (date?: Date) =>
    date
      ? new Date(date).toLocaleString(isArabic ? "ar-SA" : "en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const statusBadgeColor: Record<ReportStatus, string> = {
    NEW: "bg-amber-100 text-amber-800",
    UNDER_REVIEW: "bg-blue-100 text-blue-800",
    AWAITING_CLIENT_REPLY: "bg-purple-100 text-purple-800",
    AWAITING_PROVIDER_REPLY: "bg-purple-100 text-purple-800",
    RESOLVED: "bg-green-100 text-green-800",
    REJECTED: "bg-gray-100 text-gray-800",
    CLOSED: "bg-gray-100 text-gray-800",
    PENDING: "bg-amber-100 text-amber-800",
    REVIEWED: "bg-blue-100 text-blue-800",
    DISMISSED: "bg-gray-100 text-gray-800",
  };

  const handleStatusChange = async (value: string) => {
    try {
      await updateStatus.mutateAsync({
        reportId: id,
        status: value as ReportStatus,
        resolvedBy: user?.uid,
        resolvedByName: user?.name || user?.displayName,
      });
      logAdminAction({
        actorId: user?.uid || "",
        actorName: user?.name || user?.displayName,
        action: "REPORT_STATUS_CHANGED",
        targetType: "REPORT",
        targetId: id,
        targetLabel: report?.reporterName,
        details: `${status} → ${value}`,
      });
      toast.success(t("adminReports.statusUpdated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`${t("common.error")}: ${message}`);
    }
  };

  const handleReopen = () => handleStatusChange("UNDER_REVIEW");

  const handleAddNote = async () => {
    if (!noteText.trim() || !user) return;
    try {
      await addNote.mutateAsync({
        reportId: id,
        authorId: user.uid,
        authorName: user.name || user.displayName,
        note: noteText.trim(),
      });
      setNoteText("");
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleSendReply = async (text?: string) => {
    const messageBody = (text ?? replyText).trim();
    if (!messageBody || !user) return;
    try {
      await sendMessage.mutateAsync({
        reportId: id,
        actorId: user.uid,
        actorRole: "ADMIN",
        message: messageBody,
        actorName: user.name || user.displayName,
      });
      setReplyText("");
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleDeleteReviewContent = async () => {
    if (!report || report.targetType !== "REVIEW") return;
    try {
      await deleteReview.mutateAsync({
        reviewId: report.targetId,
        providerId: reportedReview?.providerId || "",
        bookingId: reportedReview?.bookingId,
        clientId: reportedReview?.clientId,
      });
      await addNote.mutateAsync({
        reportId: id,
        authorId: user?.uid || "",
        authorName: user?.name || user?.displayName,
        note: "[Review deleted by admin]",
      });
      logAdminAction({
        actorId: user?.uid || "",
        actorName: user?.name || user?.displayName,
        action: "REVIEW_DELETED",
        targetType: "REVIEW",
        targetId: report.targetId,
        targetLabel: reportedReview?.providerId,
      });
      toast.success(t("adminReports.contentDeleted"));
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleDeleteReply = async () => {
    if (!report?.targetId) return;
    try {
      await deleteReply.mutateAsync({
        reviewId: report.targetId,
        providerId: reportedReview?.providerId,
      });
      toast.success(t("adminReviews.replyDeleted"));
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleSuspendTarget = async () => {
    if (!report?.targetOwnerId) return;
    try {
      await suspendUser.mutateAsync({ userId: report.targetOwnerId, status: "SUSPENDED" });
      logAdminAction({
        actorId: user?.uid || "",
        actorName: user?.name || user?.displayName,
        action: "USER_SUSPENDED",
        targetType: "USER",
        targetId: report.targetOwnerId,
        targetLabel: report.targetOwnerName,
        details: `From complaint #${id}`,
      });
      toast.success(t("admin.accountSuspendedShort"));
      setSuspendConfirmOpen(false);
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleDeleteTarget = async () => {
    if (!report?.targetOwnerId) return;
    try {
      await deleteUserAccount.mutateAsync(report.targetOwnerId);
      toast.success(t("admin.accountDeleted"));
      setDeleteUserConfirmOpen(false);
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleDeleteReport = async () => {
    try {
      await deleteReportMutation.mutateAsync(id);
      toast.success(t("adminReports.reportDeleted"));
      navigate("/admin/reports");
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleDeleteMessage = async () => {
    if (!report?.chatId || !messageToDelete) return;
    try {
      await deleteMessageMutation.mutateAsync({ chatId: report.chatId, messageId: messageToDelete });
      toast.success(t("admin.messageDeleted"));
      setMessageToDelete(null);
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center">
        <p className="text-muted-foreground">{t("adminReports.reportNotFound")}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/reports")}>
          <BackIcon className="me-2 h-4 w-4" />
          {t("adminReports.backToReports")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background space-y-6">
      <Button variant="ghost" size="sm" className="gap-1 px-2" onClick={() => navigate("/admin/reports")}>
        <BackIcon className="h-4 w-4" />
        {t("adminReports.backToReports")}
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">
              {t("adminReports.reportNumber")} #{report.reportNumber ?? "—"}
            </h1>
            <Badge variant="secondary" className={statusBadgeColor[status]}>
              {t(`adminReports.status.${status}`)}
            </Badge>
            <Badge variant="outline">{t(`adminReports.targetType.${report.targetType}`)}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("adminReports.date")}: {formatDate(report.createdAt)}
            {report.updatedAt && ` · ${t("adminReports.lastUpdated")}: ${formatDate(report.updatedAt)}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isTerminal && (
            <Button variant="outline" size="sm" onClick={handleReopen} disabled={updateStatus.isPending}>
              <RotateCcw className="me-2 h-4 w-4" />
              {t("adminReports.reopen")}
            </Button>
          )}
          <Select value={status} onValueChange={handleStatusChange} disabled={updateStatus.isPending}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`adminReports.status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteReportConfirmOpen(true)}
          >
            <Trash2 className="me-2 h-4 w-4" />
            {t("adminReports.deleteReport")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reporter */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">{t("adminReports.reportedBy")}</h3>
          <Link
            to={`/admin/users/${report.reporterId}`}
            className="flex items-center gap-2 font-medium text-foreground hover:underline"
          >
            <User className="h-4 w-4 text-muted-foreground" />
            {report.reporterName || report.reporterId}
          </Link>
          {report.reporterEmail && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" /> {report.reporterEmail}
            </p>
          )}
          {report.reporterPhone && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" /> {report.reporterPhone}
            </p>
          )}
        </div>

        {/* Target owner */}
        {report.targetOwnerId && (
          <div className="rounded-lg border border-border p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">{t("adminReports.reportedUser")}</h3>
            <Link
              to={`/admin/users/${report.targetOwnerId}`}
              className="flex items-center gap-2 font-medium text-foreground hover:underline"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              {report.targetOwnerName || report.targetOwnerId}
            </Link>
            {report.targetOwnerEmail && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" /> {report.targetOwnerEmail}
              </p>
            )}
            {report.targetOwnerPhone && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" /> {report.targetOwnerPhone}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => setSuspendConfirmOpen(true)}
              >
                <Ban className="me-2 h-4 w-4" />
                {t("admin.suspendUser")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => setDeleteUserConfirmOpen(true)}
              >
                <UserX className="me-2 h-4 w-4" />
                {t("admin.deleteAccount")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Reason / description */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">{t("adminReports.reportDetails")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">{t("report.reason")}</Label>
            <p className="font-medium">
              {t(`report.reasons.${report.reason}`, { defaultValue: report.reason })}
            </p>
          </div>
          {report.description && (
            <div>
              <Label className="text-xs text-muted-foreground">{t("report.details")}</Label>
              <p className="text-sm">{report.description}</p>
            </div>
          )}
        </div>
        {report.targetContent && (
          <div className="mt-3">
            <Label className="text-xs text-muted-foreground">{t("adminReports.reportedContent")}</Label>
            <div className="mt-1 rounded-lg bg-muted p-3">
              <p className="text-sm italic">"{report.targetContent}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Images */}
      {report.images && report.images.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">{t("adminReports.attachedImages")}</h3>
          <div className="flex flex-wrap gap-3">
            {report.images.map((img) => (
              <button
                key={img.url}
                type="button"
                onClick={() => setLightboxUrl(img.url)}
                className="h-24 w-24 overflow-hidden rounded-lg border border-border"
              >
                <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Linked review */}
      {report.targetType === "REVIEW" && reportedReview && (
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">{t("adminReports.linkedReview")}</h3>
          <p className="text-sm italic">"{reportedReview.comment || t("adminReviews.noComment")}"</p>
          {reportedReview.providerReply && (
            <div className="mt-3 rounded-lg border-s-2 border-primary bg-muted p-3">
              <Label className="text-xs text-muted-foreground">{t("adminReviews.providerReply")}</Label>
              <p className="text-sm">{reportedReview.providerReply}</p>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteReviewContent}
              disabled={deleteReview.isPending}
            >
              {deleteReview.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="me-2 h-4 w-4" />
              )}
              {t("adminReports.deleteContent")}
            </Button>
            {reportedReview.providerReply && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={handleDeleteReply}
                disabled={deleteReply.isPending}
              >
                <Trash2 className="me-2 h-4 w-4" />
                {t("adminReviews.deleteReply")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Linked service / booking */}
      {(relatedService || relatedBooking) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {relatedService && (
            <div className="rounded-lg border border-border p-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">{t("adminReports.linkedService")}</h3>
              <p className="font-medium">{relatedService.title}</p>
              <p className="text-sm text-muted-foreground">{relatedService.price} SAR</p>
            </div>
          )}
          {relatedBooking && (
            <div className="rounded-lg border border-border p-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">{t("admin.orderRef")}</h3>
              <p className="font-mono text-sm">{relatedBooking.id}</p>
              <p className="text-sm text-muted-foreground">
                {t(`bookingStatus.${relatedBooking.status}`, { defaultValue: relatedBooking.status })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Linked chat */}
      {report.chatId && linkedChat && (
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">{t("adminReports.linkedChat")}</h3>
          <ScrollArea className="h-64 rounded-lg bg-muted/30 p-2">
            {chatMessages.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">{t("admin.noMessagesYet")}</p>
            ) : (
              <div className="space-y-2">
                {chatMessages.map((message) => (
                  <div key={message.id} className="flex items-start justify-between gap-2 rounded-lg bg-card p-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground">
                        {message.senderId === linkedChat.clientId
                          ? linkedChat.clientName || t("roles.client")
                          : linkedChat.providerName || t("roles.provider")}
                        {" · "}
                        {formatDate(message.createdAt)}
                      </div>
                      {message.type === "IMAGE" ? (
                        <img src={message.imageUrl} alt="attachment" className="mt-1 h-20 w-20 rounded-lg object-cover" />
                      ) : (
                        <p className="mt-1 break-words text-sm text-foreground">{message.text}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setMessageToDelete(message.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Messages with the complainant + timeline, in one thread */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="mb-1 text-sm font-semibold text-foreground">{t("adminReports.messagesAndTimeline")}</h3>
        <p className="mb-3 text-xs text-muted-foreground">{t("adminReports.messagesHint")}</p>
        <ScrollArea className="mb-3 h-72 rounded-lg bg-muted/20 p-3">
          <ReportActivityFeed
            entries={activity}
            currentUserId={user?.uid}
            emptyMessage={t("adminReports.noActivityYet")}
          />
        </ScrollArea>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_REPLIES.map((key) => (
            <Button
              key={key}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto whitespace-normal py-1 text-xs"
              onClick={() => handleSendReply(t(`adminReports.quickReplies.${key}`))}
              disabled={sendMessage.isPending}
            >
              {t(`adminReports.quickReplies.${key}`)}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={t("complaints.messagePlaceholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSendReply();
              }
            }}
          />
          <Button onClick={() => handleSendReply()} disabled={!replyText.trim() || sendMessage.isPending}>
            {sendMessage.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("adminReports.sendReply")}
          </Button>
        </div>
      </div>

      {/* Internal notes */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="mb-1 text-sm font-semibold text-foreground">{t("adminReports.internalNotes")}</h3>
        <p className="mb-3 text-xs text-muted-foreground">{t("adminReports.internalNotesHint")}</p>
        {notes.length > 0 && (
          <div className="mb-3 space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{n.authorName || n.authorId}</span>
                  <span>{formatDate(n.createdAt)}</span>
                </div>
                <p className="text-foreground">{n.note}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={t("adminReports.adminNotesPlaceholder")}
            rows={2}
            className="flex-1"
          />
          <Button onClick={handleAddNote} disabled={!noteText.trim() || addNote.isPending} className="sm:self-end">
            {addNote.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("adminReports.addNote")}
          </Button>
        </div>
      </div>

      {/* Suspend confirm */}
      <Dialog open={suspendConfirmOpen} onOpenChange={setSuspendConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.suspendTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.suspendDescription", { name: report.targetOwnerName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSuspendConfirmOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleSuspendTarget} disabled={suspendUser.isPending}>
              {t("admin.suspend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete target user confirm */}
      <Dialog open={deleteUserConfirmOpen} onOpenChange={setDeleteUserConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">{t("admin.deleteAccountTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.deleteAccountWarning", { name: report.targetOwnerName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteUserConfirmOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteTarget} disabled={deleteUserAccount.isPending}>
              {t("admin.deleteAccount")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete report confirm */}
      <Dialog open={deleteReportConfirmOpen} onOpenChange={setDeleteReportConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">{t("adminReports.deleteReportTitle")}</DialogTitle>
            <DialogDescription>{t("adminReports.deleteReportWarning")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteReportConfirmOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteReport} disabled={deleteReportMutation.isPending}>
              {t("adminReports.deleteReport")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete message confirm */}
      <Dialog open={!!messageToDelete} onOpenChange={(open) => !open && setMessageToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.deleteMessageTitle")}</DialogTitle>
            <DialogDescription>{t("admin.deleteMessageWarning")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMessageToDelete(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteMessage} disabled={deleteMessageMutation.isPending}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)}>
        <DialogContent className="sm:max-w-2xl">
          {lightboxUrl ? (
            <img src={lightboxUrl} alt="" className="max-h-[75vh] w-full rounded-lg object-contain" />
          ) : (
            <ImageOff className="mx-auto h-12 w-12 text-muted-foreground" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReportDetailPage;
