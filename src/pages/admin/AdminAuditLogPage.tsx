import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { History, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuditLogs } from "@/hooks/queries/useAuditLog";
import { AdminAuditAction } from "@/types";

const ALL_ACTIONS: AdminAuditAction[] = [
  "USER_SUSPENDED",
  "USER_ACTIVATED",
  "USER_STATUS_CHANGED",
  "USER_ROLES_CHANGED",
  "USER_DELETED",
  "VERIFICATION_APPROVED",
  "VERIFICATION_REJECTED",
  "REPORT_STATUS_CHANGED",
  "REVIEW_HIDDEN",
  "REVIEW_RESTORED",
  "REVIEW_DELETED",
  "COMMISSION_RATE_CHANGED",
];

const ACTION_BADGE_COLOR: Record<AdminAuditAction, string> = {
  USER_SUSPENDED: "bg-red-100 text-red-800",
  USER_ACTIVATED: "bg-green-100 text-green-800",
  USER_STATUS_CHANGED: "bg-amber-100 text-amber-800",
  USER_ROLES_CHANGED: "bg-blue-100 text-blue-800",
  USER_DELETED: "bg-red-100 text-red-800",
  VERIFICATION_APPROVED: "bg-green-100 text-green-800",
  VERIFICATION_REJECTED: "bg-gray-100 text-gray-800",
  REPORT_STATUS_CHANGED: "bg-blue-100 text-blue-800",
  REVIEW_HIDDEN: "bg-amber-100 text-amber-800",
  REVIEW_RESTORED: "bg-green-100 text-green-800",
  REVIEW_DELETED: "bg-red-100 text-red-800",
  COMMISSION_RATE_CHANGED: "bg-purple-100 text-purple-800",
};

const AdminAuditLogPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [actionFilter, setActionFilter] = useState<AdminAuditAction | "ALL">(
    "ALL",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const { data: logs = [], isLoading } = useAuditLogs();

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (actionFilter !== "ALL") {
      result = result.filter((entry) => entry.action === actionFilter);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (entry) =>
          entry.actorName?.toLowerCase().includes(q) ||
          entry.targetLabel?.toLowerCase().includes(q) ||
          entry.targetId?.toLowerCase().includes(q) ||
          entry.details?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [logs, actionFilter, searchQuery]);

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
        <h1 className="text-2xl font-bold text-foreground">
          {t("adminAuditLog.title")}
        </h1>
        <p className="text-muted-foreground">{t("adminAuditLog.subtitle")}</p>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      >
        <motion.div
          variants={fadeInUp}
          className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("adminAuditLog.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>
          <Select
            value={actionFilter}
            onValueChange={(value) =>
              setActionFilter(value as AdminAuditAction | "ALL")
            }
          >
            <SelectTrigger className="sm:w-64">
              <SelectValue placeholder={t("adminAuditLog.filterAction")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">
                {t("adminAuditLog.filterAllActions")}
              </SelectItem>
              {ALL_ACTIONS.map((action) => (
                <SelectItem key={action} value={action}>
                  {t(`adminAuditLog.actions.${action}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <motion.div
            variants={fadeInUp}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-12 text-center"
          >
            <History className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t("adminAuditLog.noEntries")}
            </p>
          </motion.div>
        ) : (
          <motion.div variants={fadeInUp} className="space-y-2">
            {filteredLogs.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-2 rounded-xl bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={ACTION_BADGE_COLOR[entry.action]}>
                      {t(`adminAuditLog.actions.${entry.action}`)}
                    </Badge>
                    {entry.targetLabel && (
                      <span className="text-sm font-medium text-foreground">
                        {entry.targetLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("adminAuditLog.by", {
                      name: entry.actorName || entry.actorId,
                    })}
                    {entry.details && ` · ${entry.details}`}
                  </p>
                </div>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminAuditLogPage;
