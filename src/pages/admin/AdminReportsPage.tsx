import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Flag, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReports } from "@/hooks/queries/useReports";
import { Report, ReportStatus } from "@/types";

const ALL_STATUSES: ReportStatus[] = [
  "NEW",
  "UNDER_REVIEW",
  "AWAITING_CLIENT_REPLY",
  "AWAITING_PROVIDER_REPLY",
  "RESOLVED",
  "REJECTED",
  "CLOSED",
];

const normalizeStatus = (status: ReportStatus): ReportStatus => {
  if (status === "PENDING") return "NEW";
  if (status === "REVIEWED") return "UNDER_REVIEW";
  if (status === "DISMISSED") return "REJECTED";
  return status;
};

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

const AdminReportsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<ReportStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: reports = [], isLoading } = useReports();

  const filteredReports = useMemo(() => {
    let result = reports;

    if (statusFilter !== "ALL") {
      result = result.filter((r) => normalizeStatus(r.status) === statusFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((r) => r.createdAt >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((r) => r.createdAt <= to);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          String(r.reportNumber ?? "").includes(q) ||
          r.reason?.toLowerCase().includes(q) ||
          r.reporterName?.toLowerCase().includes(q) ||
          r.targetOwnerName?.toLowerCase().includes(q) ||
          r.targetContent?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [reports, statusFilter, searchQuery, dateFrom, dateTo]);

  const getTargetTypeLabel = (type: string) => t(`adminReports.targetType.${type}`);

  const formatDateTime = (date: Date) =>
    new Date(date).toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("adminReports.title")}</h1>
        <p className="text-muted-foreground">{t("adminReports.subtitle")}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("adminReports.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ReportStatus | "ALL")}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder={t("adminReports.filterStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("adminReports.filterAllStatuses")}</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`adminReports.status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="sm:w-40"
            aria-label={t("adminReports.filterFrom")}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="sm:w-40"
            aria-label={t("adminReports.filterTo")}
          />
        </div>
      </div>

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
            <Flag className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t("adminReports.noReports")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report: Report) => {
            const status = normalizeStatus(report.status);
            return (
              <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  className="cursor-pointer transition-colors hover:bg-accent/50"
                  onClick={() => navigate(`/admin/reports/${report.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className={statusBadgeColor[status]}>
                            {t(`adminReports.status.${status}`)}
                          </Badge>
                          <Badge variant="outline">{getTargetTypeLabel(report.targetType)}</Badge>
                          {report.reportNumber && (
                            <span className="text-xs text-muted-foreground">
                              #{report.reportNumber}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-foreground">
                          {t(`report.reasons.${report.reason}`, { defaultValue: report.reason })}
                        </p>
                        <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                          <p>
                            {t("adminReports.reportedBy")}:{" "}
                            <span className="text-foreground">
                              {report.reporterName || report.reporterId}
                            </span>
                          </p>
                          {report.targetOwnerName && (
                            <p>
                              {t("adminReports.reportedUser")}:{" "}
                              <span className="text-foreground">{report.targetOwnerName}</span>
                            </p>
                          )}
                        </div>
                        {report.targetContent && (
                          <p className="mt-2 line-clamp-2 text-sm italic text-muted-foreground">
                            "{report.targetContent}"
                          </p>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDateTime(report.createdAt)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminReportsPage;
