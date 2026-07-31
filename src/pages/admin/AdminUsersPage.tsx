import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Search,
  User,
  ShieldCheck,
  Shield,
  Star,
  Phone,
  MapPin,
  Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsers } from "@/hooks/queries/useUsers";
import { getProvidersByIds } from "@/lib/firestore";
import { useQuery } from "@tanstack/react-query";
import { User as UserType, UserRole, UserStatus } from "@/types";

const AdminUsersPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "ALL">("ALL");

  const { data: users = [], isLoading } = useUsers();

  // Batched (not per-row) provider rating lookup for the list — avoids N+1.
  const providerUids = useMemo(
    () =>
      users
        .filter((u) => u.roles?.includes("PROVIDER") || u.role === "PROVIDER")
        .map((u) => u.uid),
    [users],
  );
  const { data: providerRatings = {} } = useQuery({
    queryKey: ["admin", "users", "provider-ratings", providerUids],
    queryFn: async () => {
      const profiles = await getProvidersByIds(providerUids);
      return profiles.reduce<Record<string, number>>((acc, profile) => {
        acc[profile.uid] = Number(profile.ratingAvg) || 0;
        return acc;
      }, {});
    },
    enabled: providerUids.length > 0,
  });

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !searchQuery ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole =
        roleFilter === "ALL" ||
        user.roles?.includes(roleFilter as UserRole) ||
        user.role === roleFilter;
      const matchesStatus =
        statusFilter === "ALL" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const openUserDetails = (user: UserType) => {
    navigate(`/admin/users/${user.uid}`);
  };

  const getRoleBadge = (role: UserRole | null, roles?: UserRole[]) => {
    const effectiveRole = role || (roles && roles.length > 0 ? roles[0] : null);
    const allRoles = roles && roles.length > 0 ? roles : role ? [role] : [];

    if (allRoles.length > 1) {
      return (
        <div className="flex flex-wrap gap-1">
          {allRoles.map((r) => (
            <Badge
              key={r}
              variant={
                r === "ADMIN"
                  ? "default"
                  : r === "PROVIDER"
                    ? "secondary"
                    : "outline"
              }
              className="gap-1"
            >
              {r === "ADMIN" && <Shield className="h-3 w-3" />}
              {r === "PROVIDER" && <ShieldCheck className="h-3 w-3" />}
              {r === "CLIENT" && <User className="h-3 w-3" />}
              {t(`roles.${r.toLowerCase()}`)}
            </Badge>
          ))}
        </div>
      );
    }

    switch (effectiveRole) {
      case "ADMIN":
        return (
          <Badge variant="default" className="gap-1">
            <Shield className="h-3 w-3" />
            {t("roles.admin")}
          </Badge>
        );
      case "PROVIDER":
        return (
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            {t("roles.provider")}
          </Badge>
        );
      case "CLIENT":
        return (
          <Badge variant="outline" className="gap-1">
            <User className="h-3 w-3" />
            {t("roles.client")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{t("admin.noRole")}</Badge>;
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="default" className="bg-green-500">
            {t("admin.active")}
          </Badge>
        );
      case "SUSPENDED":
        return <Badge variant="destructive">{t("admin.suspended")}</Badge>;
      default:
        return null;
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

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
            {t("admin.usersManagement")}
          </h1>
          <p className="text-muted-foreground">{t("admin.usersDescription")}</p>
        </motion.div>

        {/* Filters */}
        <motion.div
          variants={fadeInUp}
          className="mb-6 flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center"
        >
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("admin.searchUsers")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>

          <div className="flex gap-2 sm:gap-3">
            <Select
              value={roleFilter}
              onValueChange={(value) =>
                setRoleFilter(value as UserRole | "ALL")
              }
            >
              <SelectTrigger className="flex-1 md:w-40">
                <SelectValue placeholder={t("admin.role")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("admin.allRoles")}</SelectItem>
                <SelectItem value="CLIENT">{t("roles.client")}</SelectItem>
                <SelectItem value="PROVIDER">{t("roles.provider")}</SelectItem>
                <SelectItem value="ADMIN">{t("roles.admin")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as UserStatus | "ALL")
              }
            >
              <SelectTrigger className="flex-1 md:w-40">
                <SelectValue placeholder={t("admin.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("admin.allStatuses")}</SelectItem>
                <SelectItem value="ACTIVE">{t("admin.active")}</SelectItem>
                <SelectItem value="SUSPENDED">
                  {t("admin.suspended")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Users List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <motion.div
            variants={fadeInUp}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-12 text-center"
          >
            <User className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t("admin.noUsers")}</p>
          </motion.div>
        ) : (
          <motion.div variants={fadeInUp} className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.uid}
                className="flex cursor-pointer items-center justify-between rounded-xl bg-card p-4 transition-colors hover:bg-card/80"
                role="button"
                tabIndex={0}
                onClick={() => openUserDetails(user)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    openUserDetails(user);
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h3 className="font-semibold text-foreground">
                      {user.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {user.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {user.phone}
                        </span>
                      )}
                      {user.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {user.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDate(user.createdAt)}
                      </span>
                      {providerRatings[user.uid] !== undefined && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {providerRatings[user.uid].toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {getRoleBadge(user.role, user.roles)}
                      {getStatusBadge(user.status)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminUsersPage;
