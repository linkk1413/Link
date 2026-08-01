import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Flag, ChevronRight, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useReportsByReporter } from "@/hooks/queries/useReports";
import { ReportStatus } from "@/types";

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

const MyComplaintsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const isRTL = isArabic;
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const { data: reports = [], isLoading } = useReportsByReporter(user?.uid || "");

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [reports],
  );

  const formatDate = (date?: Date) =>
    date
      ? new Date(date).toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      >
        <motion.div variants={fadeInUp} className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t("complaints.title")}</h1>
          <p className="text-muted-foreground">{t("complaints.subtitle")}</p>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : sortedReports.length === 0 ? (
          <motion.div
            variants={fadeInUp}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center"
          >
            <Flag className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t("complaints.none")}</p>
          </motion.div>
        ) : (
          <motion.div variants={fadeInUp} className="space-y-3">
            {sortedReports.map((report) => {
              const status = normalizeStatus(report.status);
              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => navigate(`${location.pathname}/${report.id}`)}
                  className="flex w-full items-center justify-between rounded-xl bg-card p-4 text-start transition-colors hover:bg-card/80"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      {report.reportNumber && (
                        <span className="text-xs text-muted-foreground">
                          {t("adminReports.reportNumber")} #{report.reportNumber}
                        </span>
                      )}
                      <Badge variant="secondary" className={statusBadgeColor[status]}>
                        {t(`complaints.status.${status}`)}
                      </Badge>
                    </div>
                    <p className="truncate font-medium text-foreground">
                      {t(`report.reasons.${report.reason}`, { defaultValue: report.reason })}
                    </p>
                    {report.targetOwnerName && (
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {t("adminReports.reportedUser")}: {report.targetOwnerName}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>
                        {t("adminReports.date")}: {formatDate(report.createdAt)}
                      </span>
                      {report.updatedAt && (
                        <span>
                          {t("adminReports.lastUpdated")}: {formatDate(report.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronIcon className="ms-2 h-5 w-5 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default MyComplaintsPage;
