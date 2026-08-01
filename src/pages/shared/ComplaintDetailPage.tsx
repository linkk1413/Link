import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Send, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ReportActivityFeed } from "@/components/ReportActivityFeed";
import { useAuth } from "@/contexts/AuthContext";
import {
  useReportLive,
  useReportActivityLive,
  useSendReportMessage,
} from "@/hooks/queries/useReports";
import { ReportStatus } from "@/types";
import { toast } from "sonner";

const normalizeStatus = (status: ReportStatus): ReportStatus => {
  if (status === "PENDING") return "NEW";
  if (status === "REVIEWED") return "UNDER_REVIEW";
  if (status === "DISMISSED") return "REJECTED";
  return status;
};

const statusBadgeColor: Record<string, string> = {
  NEW: "bg-amber-100 text-amber-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  AWAITING_CLIENT_REPLY: "bg-purple-100 text-purple-800",
  AWAITING_PROVIDER_REPLY: "bg-purple-100 text-purple-800",
  RESOLVED: "bg-green-100 text-green-800",
  REJECTED: "bg-gray-100 text-gray-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const ComplaintDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id = "" } = useParams<{ id: string }>();

  const [messageText, setMessageText] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const { data: report, isLoading: loadingReport } = useReportLive(id);
  const { data: activity = [], isLoading: loadingActivity } = useReportActivityLive(id);
  const sendMessage = useSendReportMessage();

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activity.length]);

  const handleSend = async () => {
    if (!messageText.trim() || !user) return;
    try {
      await sendMessage.mutateAsync({
        reportId: id,
        actorId: user.uid,
        actorRole: "USER",
        message: messageText.trim(),
        actorName: user.name || user.displayName,
      });
      setMessageText("");
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loadingReport) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b border-border bg-card p-4">
          <Skeleton className="h-8 w-48" />
        </header>
        <div className="flex-1 space-y-4 p-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-3/4" />
          ))}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">{t("complaints.notFound")}</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
          {t("common.back")}
        </Button>
      </div>
    );
  }

  const status = normalizeStatus(report.status);
  const isClosed = status === "CLOSED";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold text-foreground">
              {t("adminReports.reportNumber")} #{report.reportNumber ?? "—"}
            </h1>
            <Badge variant="secondary" className={statusBadgeColor[status]}>
              {t(`complaints.status.${status}`)}
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-28">
        {/* Complaint details */}
        <div className="mb-4 rounded-xl bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("report.reason")}</p>
          <p className="font-medium text-foreground">
            {t(`report.reasons.${report.reason}`, { defaultValue: report.reason })}
          </p>
          {report.description && (
            <>
              <p className="mt-2 text-xs text-muted-foreground">{t("report.details")}</p>
              <p className="text-sm text-foreground">{report.description}</p>
            </>
          )}
          {report.targetOwnerName && (
            <>
              <p className="mt-2 text-xs text-muted-foreground">{t("adminReports.reportedUser")}</p>
              <p className="text-sm text-foreground">{report.targetOwnerName}</p>
            </>
          )}
          {report.images && report.images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {report.images.map((img) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setLightboxUrl(img.url)}
                  className="h-16 w-16 overflow-hidden rounded-lg border border-border"
                >
                  <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed: timeline + messages, chronological */}
        {loadingActivity ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-2/3" />
            ))}
          </div>
        ) : (
          <ReportActivityFeed entries={activity} currentUserId={user?.uid} />
        )}
        <div ref={feedEndRef} />
      </main>

      {/* Message composer */}
      {!isClosed && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4 safe-bottom">
          <div className="flex items-center gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t("complaints.messagePlaceholder")}
              className="flex-1 rounded-full"
            />
            <Button
              size="icon"
              className="shrink-0 rounded-full"
              onClick={handleSend}
              disabled={!messageText.trim() || sendMessage.isPending}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

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

export default ComplaintDetailPage;
