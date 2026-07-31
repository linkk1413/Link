import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  MoreVertical,
  User,
  ShieldCheck,
  Shield,
  Ban,
  CheckCircle,
  CreditCard,
  UserCog,
  Pencil,
  Trash2,
  Star,
  Phone,
  MapPin,
  Calendar,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  useUsers,
  useUpdateUserStatus,
  useUpdateUserRole,
  useAdminUpdateUserProfile,
  useDeleteUserAccount,
  useUserActivityCounts,
} from "@/hooks/queries/useUsers";
import {
  usePaymentsByClient,
  usePaymentsByProvider,
} from "@/hooks/queries/usePayments";
import { useProviderProfile } from "@/hooks/queries/useProviders";
import { getProvidersByIds } from "@/lib/firestore";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import { User as UserType, UserRole, UserStatus } from "@/types";
import {
  getCityLabel,
  getDistrictLabel,
  getRegionLabel,
} from "@/lib/saudiLocations";

const AdminUsersPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "ALL">("ALL");
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "suspend" | "activate" | null;
  }>({ open: false, action: null });
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<UserType | null>(null);
  const [roleDialog, setRoleDialog] = useState<{
    open: boolean;
    user: UserType | null;
    newRole: UserRole;
  }>({ open: false, user: null, newRole: "CLIENT" });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    region: "",
    city: "",
    district: "",
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    user: UserType | null;
    confirmed: boolean;
  }>({ open: false, user: null, confirmed: false });

  // Fetch users
  const { data: users = [], isLoading } = useUsers();
  const updateStatusMutation = useUpdateUserStatus();
  const updateRoleMutation = useUpdateUserRole();
  const updateProfileMutation = useAdminUpdateUserProfile();
  const deleteAccountMutation = useDeleteUserAccount();
  const detailsUserId = detailsUser?.uid || "";
  const { data: providerProfile } = useProviderProfile(detailsUserId);
  const { data: providerPayments = [] } = usePaymentsByProvider(detailsUserId);
  const { data: clientPayments = [] } = usePaymentsByClient(detailsUserId);
  const { data: activityCounts } = useUserActivityCounts(detailsUserId);

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
        acc[profile.uid] = profile.ratingAvg;
        return acc;
      }, {});
    },
    enabled: providerUids.length > 0,
  });

  const isProviderDetails =
    detailsUser?.role === "PROVIDER" || Boolean(providerProfile);
  const isClientDetails = detailsUser?.role === "CLIENT";

  const detailPayments = useMemo(() => {
    if (isProviderDetails) return providerPayments;
    if (isClientDetails) return clientPayments;
    return providerPayments.length || clientPayments.length
      ? [...providerPayments, ...clientPayments]
      : [];
  }, [isProviderDetails, isClientDetails, providerPayments, clientPayments]);

  const capturedTotal = useMemo(() => {
    return detailPayments
      .filter((payment) => payment.status === "CAPTURED")
      .reduce((sum, payment) => sum + (payment.amountSar || payment.amount), 0);
  }, [detailPayments]);

  const authorizedTotal = useMemo(() => {
    return detailPayments
      .filter((payment) => payment.status === "AUTHORIZED")
      .reduce((sum, payment) => sum + (payment.amountSar || payment.amount), 0);
  }, [detailPayments]);

  const totalAmount = useMemo(() => {
    return detailPayments.reduce(
      (sum, payment) => sum + (payment.amountSar || payment.amount),
      0,
    );
  }, [detailPayments]);

  const recentDetailPayments = useMemo(
    () => detailPayments.slice(0, 5),
    [detailPayments],
  );

  // Filter users
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

  const handleAction = (user: UserType, action: "suspend" | "activate") => {
    setSelectedUser(user);
    setActionDialog({ open: true, action });
  };

  const openRoleDialog = (user: UserType) => {
    const currentRole = user.role || user.roles?.[0] || "CLIENT";
    setRoleDialog({ open: true, user, newRole: currentRole });
  };

  const confirmRoleChange = async () => {
    if (!roleDialog.user) return;
    try {
      await updateRoleMutation.mutateAsync({
        userId: roleDialog.user.uid,
        role: roleDialog.newRole,
      });
      setRoleDialog({ open: false, user: null, newRole: "CLIENT" });
    } catch (error) {
      console.error("Failed to update user role:", error);
    }
  };

  const openUserDetails = (user: UserType) => {
    setDetailsUser(user);
    setDetailsDialogOpen(true);
  };

  const openEditDialog = (user: UserType) => {
    setDetailsUser(user);
    setEditForm({
      name: user.name || "",
      phone: user.phone || "",
      region: user.region || "",
      city: user.city || "",
      district: user.district || "",
    });
    setEditDialogOpen(true);
  };

  const confirmEditUser = async () => {
    if (!detailsUser) return;
    try {
      await updateProfileMutation.mutateAsync({
        userId: detailsUser.uid,
        updates: editForm,
      });
      toast.success(t("common.success"));
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Failed to update user:", error);
      toast.error(t("common.error"));
    }
  };

  const openDeleteDialog = (user: UserType) => {
    setDeleteDialog({ open: true, user, confirmed: false });
  };

  const confirmDeleteUser = async () => {
    if (!deleteDialog.user || !deleteDialog.confirmed) return;
    try {
      await deleteAccountMutation.mutateAsync(deleteDialog.user.uid);
      toast.success(t("admin.accountDeleted"));
      setDeleteDialog({ open: false, user: null, confirmed: false });
      setDetailsDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error(t("common.error"));
    }
  };

  const handleViewPayments = (user: UserType) => {
    openUserDetails(user);
  };

  const confirmAction = async () => {
    if (!selectedUser || !actionDialog.action) return;

    const newStatus: UserStatus =
      actionDialog.action === "suspend" ? "SUSPENDED" : "ACTIVE";

    try {
      await updateStatusMutation.mutateAsync({
        userId: selectedUser.uid,
        status: newStatus,
      });
      setActionDialog({ open: false, action: null });
      setSelectedUser(null);
    } catch (error) {
      console.error("Failed to update user status:", error);
    }
  };

  const getRoleBadge = (role: UserRole | null, roles?: UserRole[]) => {
    // Check roles array first (new format), then fall back to single role (legacy)
    const effectiveRole = role || (roles && roles.length > 0 ? roles[0] : null);
    const allRoles = roles && roles.length > 0 ? roles : role ? [role] : [];

    // If user has multiple roles, show all of them
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

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {user.status === "ACTIVE" ? (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAction(user, "suspend");
                        }}
                      >
                        <Ban className="me-2 h-4 w-4" />
                        {t("admin.suspendUser")}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAction(user, "activate");
                        }}
                      >
                        <CheckCircle className="me-2 h-4 w-4" />
                        {t("admin.activateUser")}
                      </DropdownMenuItem>
                    )}
                    {(user.roles?.includes("PROVIDER") ||
                      user.role === "PROVIDER") && (
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          handleViewPayments(user);
                        }}
                      >
                        <CreditCard className="me-2 h-4 w-4" />
                        {t("admin.viewProviderPayments")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation();
                        openRoleDialog(user);
                      }}
                    >
                      <UserCog className="me-2 h-4 w-4" />
                      {t("admin.changeRole")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditDialog(user);
                      }}
                    >
                      <Pencil className="me-2 h-4 w-4" />
                      {t("admin.editUser")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDeleteDialog(user);
                      }}
                    >
                      <Trash2 className="me-2 h-4 w-4" />
                      {t("admin.deleteAccount")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>

      <Dialog
        open={detailsDialogOpen}
        onOpenChange={(open) => {
          setDetailsDialogOpen(open);
          if (!open) {
            setDetailsUser(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.userDetails")}</DialogTitle>
            <DialogDescription>{detailsUser?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">
                {t("admin.personalInfo")}
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("profile.fullName")}
                  </p>
                  <p className="text-sm font-medium">
                    {detailsUser?.displayName || detailsUser?.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("profile.email")}
                  </p>
                  <p className="text-sm font-medium">{detailsUser?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("profile.phone")}
                  </p>
                  <p className="text-sm font-medium">
                    {detailsUser?.phone || t("admin.notProvided")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.role")}
                  </p>
                  <div className="mt-1">
                    {getRoleBadge(
                      detailsUser?.role || null,
                      detailsUser?.roles,
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.status")}
                  </p>
                  <div className="mt-1">
                    {detailsUser ? getStatusBadge(detailsUser.status) : null}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.joinedAt")}
                  </p>
                  <p className="text-sm font-medium">
                    {detailsUser ? formatDate(detailsUser.createdAt) : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.lastLogin")}
                  </p>
                  <p className="text-sm font-medium">
                    {detailsUser?.lastLoginAt
                      ? formatDate(detailsUser.lastLoginAt)
                      : t("admin.notProvided")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.orderCount")}
                  </p>
                  <p className="text-sm font-medium">
                    {activityCounts?.bookingCount ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.reportCount")}
                  </p>
                  <p className="text-sm font-medium">
                    {activityCounts?.reportCount ?? "—"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">
                    {t("admin.userId")}
                  </p>
                  <p className="text-sm font-medium break-all">
                    {detailsUser?.uid}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">
                {t("admin.locationInfo")}
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("profile.region")}
                  </p>
                  <p className="text-sm font-medium">
                    {getRegionLabel(
                      providerProfile?.region || detailsUser?.region || "",
                      isArabic,
                    ) || t("admin.notProvided")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("profile.city")}
                  </p>
                  <p className="text-sm font-medium">
                    {getCityLabel(
                      providerProfile?.city || detailsUser?.city || "",
                      isArabic,
                    ) || t("admin.notProvided")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("profile.district")}
                  </p>
                  <p className="text-sm font-medium">
                    {getDistrictLabel(
                      providerProfile?.area || detailsUser?.district || "",
                      isArabic,
                    ) || t("admin.notProvided")}
                  </p>
                </div>
              </div>
            </div>

            {isProviderDetails && (
              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("admin.providerProfile")}
                </h3>
                {!providerProfile ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t("admin.noProviderProfile")}
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.verificationStatus")}
                      </p>
                      <div className="mt-1">
                        {providerProfile.identityVerified ? (
                          <Badge variant="default">
                            {t("provider.verified")}
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            {t("admin.notVerified")}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.ratingSummary")}
                      </p>
                      <p className="text-sm font-medium">
                        {providerProfile.ratingAvg.toFixed(1)} (
                        {providerProfile.ratingCount})
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.travelRadius")}
                      </p>
                      <p className="text-sm font-medium">
                        {providerProfile.radiusKm !== undefined &&
                        providerProfile.radiusKm !== null
                          ? `${providerProfile.radiusKm} km`
                          : t("admin.notProvided")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.travelFee")}
                      </p>
                      <p className="text-sm font-medium">
                        {providerProfile.travelFeeBase !== undefined &&
                        providerProfile.travelFeeBase !== null
                          ? `${providerProfile.travelFeeBase} SAR`
                          : t("admin.notProvided")}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">
                        {t("profile.bio")}
                      </p>
                      <p className="text-sm font-medium">
                        {providerProfile.bio || t("provider.noBio")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isProviderDetails && providerProfile && (
              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("profile.bankAccount")}
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("profile.accountHolder")}
                    </p>
                    <p className="text-sm font-medium">
                      {providerProfile.bankAccountHolder ||
                        t("admin.notProvided")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("profile.bankName")}
                    </p>
                    <p className="text-sm font-medium">
                      {providerProfile.bankName || t("admin.notProvided")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("profile.accountNumber")}
                    </p>
                    <p className="text-sm font-medium break-all">
                      {providerProfile.bankAccountNumber ||
                        t("admin.notProvided")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("profile.iban")}
                    </p>
                    <p className="text-sm font-medium break-all">
                      {providerProfile.bankIBAN || t("admin.notProvided")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(isProviderDetails ||
              isClientDetails ||
              detailPayments.length > 0) && (
              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("admin.paymentsSummary")}
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.totalPayments")}
                    </p>
                    <p className="text-sm font-medium">
                      {detailPayments.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.totalAmount")}
                    </p>
                    <p className="text-sm font-medium">
                      {totalAmount.toFixed(2)} SAR
                    </p>
                  </div>
                  {isProviderDetails && (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("admin.capturedTotal")}
                        </p>
                        <p className="text-sm font-medium">
                          {capturedTotal.toFixed(2)} SAR
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("admin.authorizedTotal")}
                        </p>
                        <p className="text-sm font-medium">
                          {authorizedTotal.toFixed(2)} SAR
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-foreground">
                    {t("admin.recentPayments")}
                  </p>
                  {recentDetailPayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("admin.noPayments")}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {recentDetailPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {payment.status}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(payment.createdAt)}
                            </p>
                          </div>
                          <p className="text-sm font-semibold">
                            {(payment.amountSar || payment.amount).toFixed(2)}{" "}
                            SAR
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDetailsDialogOpen(false)}
            >
              {t("common.close")}
            </Button>
            {detailsUser && (
              <Button onClick={() => openEditDialog(detailsUser)}>
                <Pencil className="me-2 h-4 w-4" />
                {t("admin.editUser")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.editUser")}</DialogTitle>
            <DialogDescription>{detailsUser?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("profile.fullName")}</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">{t("profile.phone")}</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city">{t("profile.city")}</Label>
              <Input
                id="edit-city"
                value={editForm.city}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, city: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-region">{t("profile.region")}</Label>
              <Input
                id="edit-region"
                value={editForm.region}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, region: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-district">{t("profile.district")}</Label>
              <Input
                id="edit-district"
                value={editForm.district}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, district: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={confirmEditUser}
              disabled={updateProfileMutation.isPending}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog — most destructive action on this page */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, user: open ? deleteDialog.user : null, confirmed: false })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {t("admin.deleteAccountTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.deleteAccountWarning", { name: deleteDialog.user?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <Checkbox
              id="confirm-delete"
              checked={deleteDialog.confirmed}
              onCheckedChange={(checked) =>
                setDeleteDialog((prev) => ({ ...prev, confirmed: checked === true }))
              }
            />
            <Label htmlFor="confirm-delete" className="text-sm">
              {t("admin.deleteAccountConfirmCheckbox")}
            </Label>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setDeleteDialog({ open: false, user: null, confirmed: false })
              }
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUser}
              disabled={!deleteDialog.confirmed || deleteAccountMutation.isPending}
            >
              {t("admin.deleteAccount")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog
        open={roleDialog.open}
        onOpenChange={(open) =>
          setRoleDialog({ open, user: open ? roleDialog.user : null, newRole: roleDialog.newRole })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.changeRoleTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.changeRoleDescription", { name: roleDialog.user?.name })}
            </DialogDescription>
          </DialogHeader>
          <Select
            value={roleDialog.newRole}
            onValueChange={(value) =>
              setRoleDialog((prev) => ({ ...prev, newRole: value as UserRole }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CLIENT">{t("roles.client")}</SelectItem>
              <SelectItem value="PROVIDER">{t("roles.provider")}</SelectItem>
              <SelectItem value="ADMIN">{t("roles.admin")}</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setRoleDialog({ open: false, user: null, newRole: "CLIENT" })
              }
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={confirmRoleChange}
              disabled={updateRoleMutation.isPending}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog({ open, action: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "suspend"
                ? t("admin.suspendTitle")
                : t("admin.activateTitle")}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "suspend"
                ? t("admin.suspendDescription", { name: selectedUser?.name })
                : t("admin.activateDescription", { name: selectedUser?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, action: null })}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant={
                actionDialog.action === "suspend" ? "destructive" : "default"
              }
              onClick={confirmAction}
              disabled={updateStatusMutation.isPending}
            >
              {actionDialog.action === "suspend"
                ? t("admin.suspend")
                : t("admin.activate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersPage;
