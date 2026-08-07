import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsers } from "@/hooks/queries/useUsers";
import { useProvidersByIds } from "@/hooks/queries/useProviders";
import { SubscriptionActions } from "@/components/admin/SubscriptionActions";

type StatusFilter =
  | "ALL"
  | "ACTIVE"
  | "TRIAL"
  | "EXPIRED"
  | "CANCELLED"
  | "LOCKED"
  | "EXPIRING_SOON"
  | "PENDING_ACTIVATION";

const AdminSubscriptionsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isArabic = i18n.language === "ar";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const { data: users = [], isLoading } = useUsers();

  // Get all providers - check both roles array and legacy role field
  const providers = useMemo(() => {
    return users.filter(
      (user) => user.roles?.includes("PROVIDER") || user.role === "PROVIDER",
    );
  }, [users]);

  const providerUids = useMemo(() => providers.map((p) => p.uid), [providers]);
  const { data: profiles = [], isLoading: isLoadingProfiles } =
    useProvidersByIds(providerUids);
  const providerProfiles = useMemo(
    () => new Map(profiles.map((profile) => [profile.uid, profile])),
    [profiles],
  );

  const formatDate = (date: Date | undefined) => {
    if (!date) return t("admin.notProvided");
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return t("admin.notProvided");
    return parsed.toLocaleDateString();
  };

  const daysUntilExpiry = (endDate: Date | undefined) => {
    if (!endDate) return -1;
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) return -1;
    return Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  // Filter subscriptions
  const filteredSubscriptions = useMemo(() => {
    return providers
      .map((user) => ({ user, profile: providerProfiles.get(user.uid) }))
      .filter((item) => {
        const name = item.user.name.toLowerCase();
        const email = item.user.email.toLowerCase();
        const query = searchQuery.toLowerCase();
        const matchesSearch = name.includes(query) || email.includes(query);
        if (!matchesSearch) return false;

        switch (statusFilter) {
          case "ALL":
            return true;
          case "LOCKED":
            return item.profile?.accountStatus === "LOCKED";
          case "EXPIRING_SOON": {
            const days = daysUntilExpiry(item.profile?.subscriptionEndDate);
            return days > 0 && days <= 7;
          }
          case "PENDING_ACTIVATION":
            return item.profile?.paymentVerificationStatus === "PENDING";
          default:
            return item.profile?.subscriptionStatus === statusFilter;
        }
      });
  }, [providers, providerProfiles, searchQuery, statusFilter]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const active = profiles.filter(
      (p) => p.subscriptionStatus === "ACTIVE" && p.accountStatus === "ACTIVE",
    ).length;
    const trial = profiles.filter((p) => p.subscriptionStatus === "TRIAL").length;
    const expired = profiles.filter(
      (p) => p.subscriptionStatus === "EXPIRED" || !p.subscriptionStatus,
    ).length;
    const locked = profiles.filter((p) => p.accountStatus === "LOCKED").length;

    return { active, trial, expired, locked };
  }, [profiles]);

  const isLoading_ = isLoading || isLoadingProfiles;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="mb-6 text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
        {t("admin.subscriptions")}
      </h1>

      {/* Metrics Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.activeSubscriptions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.active}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.trialSubscriptions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{metrics.trial}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.expiredSubscriptions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{metrics.expired}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.lockedAccounts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{metrics.locked}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground ${isArabic ? "right-3" : "left-3"}`}
          />
          <Input
            placeholder={t("admin.searchProviders")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={isArabic ? "pr-10" : "pl-10"}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder={t("admin.filter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("common.all")}</SelectItem>
            <SelectItem value="ACTIVE">{t("admin.active")}</SelectItem>
            <SelectItem value="TRIAL">{t("admin.trial")}</SelectItem>
            <SelectItem value="EXPIRED">{t("admin.expired")}</SelectItem>
            <SelectItem value="CANCELLED">{t("admin.cancelled")}</SelectItem>
            <SelectItem value="LOCKED">{t("admin.locked")}</SelectItem>
            <SelectItem value="EXPIRING_SOON">{t("admin.expiringSoon")}</SelectItem>
            <SelectItem value="PENDING_ACTIVATION">
              {t("admin.pendingActivation")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subscriptions List — click a row to open the account's full page
          (users section is the single source of truth for managing it);
          the quick-action buttons here still work without navigating,
          via stopPropagation. */}
      <Card>
        <CardContent className="p-0">
          {isLoading_ ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {t("admin.noSubscriptions")}
            </div>
          ) : (
            <div className="divide-y">
              {filteredSubscriptions.map(({ user, profile }) => (
                <div
                  key={user.uid}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/users/${user.uid}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate(`/admin/users/${user.uid}`);
                  }}
                  className="flex cursor-pointer flex-col gap-3 p-4 hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {user.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={
                            profile?.subscriptionStatus === "ACTIVE"
                              ? "default"
                              : profile?.subscriptionStatus === "EXPIRED"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {profile?.subscriptionStatus || "EXPIRED"}
                        </Badge>
                        {profile?.paymentVerificationStatus === "PENDING" && (
                          <Badge variant="outline">
                            {t("admin.pendingActivation")}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {profile?.subscriptionEndDate && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {t("admin.expiresOn")}:{" "}
                          {formatDate(profile.subscriptionEndDate)}
                        </span>
                        {daysUntilExpiry(profile.subscriptionEndDate) <= 7 &&
                          daysUntilExpiry(profile.subscriptionEndDate) > 0 && (
                            <AlertCircle className="ml-2 h-4 w-4 text-amber-600" />
                          )}
                      </div>
                    )}
                  </div>

                  {profile && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <SubscriptionActions provider={profile} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminSubscriptionsPage;
