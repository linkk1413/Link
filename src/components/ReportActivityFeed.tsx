import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ReportActivityEntry, ReportStatus } from "@/types";

const normalizeStatus = (status: ReportStatus): ReportStatus => {
  if (status === "PENDING") return "NEW";
  if (status === "REVIEWED") return "UNDER_REVIEW";
  if (status === "DISMISSED") return "REJECTED";
  return status;
};

interface ReportActivityFeedProps {
  entries: ReportActivityEntry[];
  currentUserId?: string;
  emptyMessage?: string;
}

// Renders a report's activity subcollection as one chronological feed: chat
// bubbles for MESSAGE entries (aligned by whether the current viewer sent
// it), centered system labels for CREATED/STATUS_CHANGE. Shared between the
// admin report detail page and the reporter-facing complaint page so both
// sides see exactly the same thread.
export const ReportActivityFeed: React.FC<ReportActivityFeedProps> = ({
  entries,
  currentUserId,
  emptyMessage,
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const formatDateTime = (date: Date) =>
    new Date(date).toLocaleString(isArabic ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (entries.length === 0 && emptyMessage) {
    return <p className="py-8 text-center text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        if (entry.type === "MESSAGE") {
          const isOwn = entry.actorId === currentUserId;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  isOwn
                    ? "rounded-ee-sm bg-primary text-primary-foreground"
                    : "rounded-ss-sm bg-muted"
                }`}
              >
                {!isOwn && entry.actorName && (
                  <p className="mb-0.5 text-xs font-medium text-primary">{entry.actorName}</p>
                )}
                <p className="whitespace-pre-wrap break-words text-sm">{entry.message}</p>
                <p
                  className={`mt-1 text-end text-[10px] ${
                    isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {formatDateTime(entry.createdAt)}
                </p>
              </div>
            </motion.div>
          );
        }

        const label =
          entry.type === "CREATED"
            ? t("complaints.timelineCreated")
            : t("complaints.timelineStatusChange", {
                status: t(`complaints.status.${normalizeStatus(entry.toStatus || "NEW")}`),
              });

        return (
          <div key={entry.id} className="flex justify-center">
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              {label} · {formatDateTime(entry.createdAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default ReportActivityFeed;
