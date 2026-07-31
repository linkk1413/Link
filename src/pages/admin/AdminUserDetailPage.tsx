import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Ban,
  CheckCircle,
  UserCog,
  Pencil,
  Trash2,
  Star,
  Phone,
  Mail,
  Eye,
  AlertTriangle,
  EyeOff,
  RotateCcw,
  Reply,
  User,
  MessageSquare,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { StarRating } from "@/components/StarRating";
import {
  useUser,
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
import {
  useClientChats,
  useProviderChats,
  useChatMessages,
  useDeleteMessage,
} from "@/hooks/queries/useChats";
import {
  useAdminProviderReviews,
  useClientReviews,
  useDeleteReview,
  useSetReviewHidden,
} from "@/hooks/queries/useReviews";
import { toast } from "@/components/ui/sonner";
import { UserRole, UserStatus, Chat, Review } from "@/types";
import {
  getCityLabel,
  getDistrictLabel,
  getRegionLabel,
} from "@/lib/saudiLocations";

const AdminUserDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const isRTL = isArabic;
  const navigate = useNavigate();
  const { uid = "" } = useParams<{ uid: string }>();

  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "suspend" | "activate" | null;
  }>({ open: false, action: null });
  const [roleDialog, setRoleDialog] = useState<{
    open: boolean;
    newRole: UserRole;
  }>({ open: false, newRole: "CLIENT" });
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
    confirmed: boolean;
  }>({ open: false, confirmed: false });
  const [viewingChat, setViewingChat] = useState<Chat | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<{
    chatId: string;
    messageId: string;
  } | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<{
    uid: string;
    label: string;
  } | null>(null);
  const [reviewAction, setReviewAction] = useState<{
    review: Review;
    type: "delete" | "hide" | "restore";
  } | null>(null);

  const { data: detailsUser, isLoading: loadingUser } = useUser(uid);
  const { data: users = [] } = useUsers();
  const { data: providerProfile } = useProviderProfile(uid);
  const { data: providerPayments = [] } = usePaymentsByProvider(uid);
  const { data: clientPayments = [] } = usePaymentsByClient(uid);
  const { data: activityCounts } = useUserActivityCounts(uid);

  const { data: chatsAsClient = [] } = useClientChats(uid);
  const { data: chatsAsProvider = [] } = useProviderChats(uid);
  const userChats = useMemo(
    () => [...chatsAsClient, ...chatsAsProvider],
    [chatsAsClient, chatsAsProvider],
  );
  const { data: viewingMessages = [], isLoading: loadingViewingMessages } =
    useChatMessages(viewingChat?.id || "");

  const usersByUid = useMemo(
    () => new Map(users.map((u) => [u.uid, u])),
    [users],
  );

  const updateStatusMutation = useUpdateUserStatus();
  const updateRoleMutation = useUpdateUserRole();
  const updateProfileMutation = useAdminUpdateUserProfile();
  const deleteAccountMutation = useDeleteUserAccount();
  const deleteMessageMutation = useDeleteMessage();
  const suspendMutation = useUpdateUserStatus();
  const deleteReviewMutation = useDeleteReview();
  const setReviewHiddenMutation = useSetReviewHidden();

  const isProviderDetails =
    detailsUser?.role === "PROVIDER" ||
    detailsUser?.roles?.includes("PROVIDER") ||
    Boolean(providerProfile);
  const isClientDetails =
    detailsUser?.role === "CLIENT" || detailsUser?.roles?.includes("CLIENT");

  const { data: providerReviews = [], isLoading: loadingProviderReviews } =
    useAdminProviderReviews(isProviderDetails ? uid : "");
  const { data: clientReviews = [], isLoading: loadingClientReviews } =
    useClientReviews(!isProviderDetails && isClientDetails ? uid : "");

  const reviews = isProviderDetails ? providerReviews : clientReviews;
  const loadingReviews = isProviderDetails
    ? loadingProviderReviews
    : loadingClientReviews;

  const detailPayments = useMemo(() => {
    if (isProviderDetails) return providerPayments;
    if (isClientDetails) return clientPayments;
    return providerPayments.length || clientPayments.length
      ? [...providerPayments, ...clientPayments]
      : [];
  }, [isProviderDetails, isClientDetails, providerPayments, clientPayments]);

  const capturedTotal = useMemo(
    () =>
      detailPayments
        .filter((payment) => payment.status === "CAPTURED")
        .reduce(
          (sum, payment) => sum + (Number(payment.amountSar || payment.amount) || 0),
          0,
        ),
    [detailPayments],
  );

  const authorizedTotal = useMemo(
    () =>
      detailPayments
        .filter((payment) => payment.status === "AUTHORIZED")
        .reduce(
          (sum, payment) => sum + (Number(payment.amountSar || payment.amount) || 0),
          0,
        ),
    [detailPayments],
  );

  const totalAmount = useMemo(
    () =>
      detailPayments.reduce(
        (sum, payment) => sum + (Number(payment.amountSar || payment.amount) || 0),
        0,
      ),
    [detailPayments],
  );

  const recentDetailPayments = useMemo(
    () => detailPayments.slice(0, 5),
    [detailPayments],
  );

  const openRoleDialog = () => {
    if (!detailsUser) return;
    const currentRole = detailsUser.role || detailsUser.roles?.[0] || "CLIENT";
    setRoleDialog({ open: true, newRole: currentRole });
  };

  const confirmRoleChange = async () => {
    if (!detailsUser) return;
    try {
      await updateRoleMutation.mutateAsync({
        userId: detailsUser.uid,
        role: roleDialog.newRole,
      });
      setRoleDialog({ open: false, newRole: "CLIENT" });
      toast.success(t("common.success"));
    } catch (error) {
      console.error("Failed to update user role:", error);
      toast.error(t("common.error"));
    }
  };

  const openEditDialog = () => {
    if (!detailsUser) return;
    setEditForm({
      name: detailsUser.name || "",
      phone: detailsUser.phone || "",
      region: detailsUser.region || "",
      city: detailsUser.city || "",
      district: detailsUser.district || "",
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

  const confirmDeleteUser = async () => {
    if (!detailsUser || !deleteDialog.confirmed) return;
    try {
      await deleteAccountMutation.mutateAsync(detailsUser.uid);
      toast.success(t("admin.accountDeleted"));
      setDeleteDialog({ open: false, confirmed: false });
      navigate("/admin/users");
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error(t("common.error"));
    }
  };

  const confirmAction = async () => {
    if (!detailsUser || !actionDialog.action) return;
    const newStatus: UserStatus =
      actionDialog.action === "suspend" ? "SUSPENDED" : "ACTIVE";
    try {
      await updateStatusMutation.mutateAsync({
        userId: detailsUser.uid,
        status: newStatus,
      });
      setActionDialog({ open: false, action: null });
    } catch (error) {
      console.error("Failed to update user status:", error);
      toast.error(t("common.error"));
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;
    try {
      await deleteMessageMutation.mutateAsync(messageToDelete);
      toast.success(t("admin.messageDeleted"));
      setMessageToDelete(null);
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast.error(t("common.error"));
    }
  };

  const confirmSuspendParticipant = async () => {
    if (!suspendTarget) return;
    try {
      await suspendMutation.mutateAsync({
        userId: suspendTarget.uid,
        status: "SUSPENDED",
      });
      toast.success(t("admin.accountSuspendedShort"));
      setSuspendTarget(null);
    } catch (error) {
      console.error("Failed to suspend account:", error);
      toast.error(t("common.error"));
    }
  };

  const confirmReviewAction = async () => {
    if (!reviewAction) return;
    const { review, type } = reviewAction;
    try {
      if (type === "delete") {
        await deleteReviewMutation.mutateAsync({
          reviewId: review.id,
          providerId: review.providerId,
          bookingId: review.bookingId,
          clientId: review.clientId,
        });
        toast.success(t("adminReviews.reviewDeleted"));
      } else {
        await setReviewHiddenMutation.mutateAsync({
          reviewId: review.id,
          hidden: type === "hide",
          providerId: review.providerId,
          clientId: review.clientId,
        });
        toast.success(
          type === "hide"
            ? t("adminReviews.reviewHidden")
            : t("adminReviews.reviewRestored"),
        );
      }
      setReviewAction(null);
    } catch (error) {
      console.error("Failed to update review:", error);
      toast.error(t("common.error"));
    }
  };

  const getRoleBadge = () => {
    const role = detailsUser?.role || null;
    const roles = detailsUser?.roles;
    const allRoles = roles && roles.length > 0 ? roles : role ? [role] : [];
    if (allRoles.length === 0) {
      return <Badge variant="outline">{t("admin.noRole")}</Badge>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {allRoles.map((r) => (
          <Badge
            key={r}
            variant={
              r === "ADMIN" ? "default" : r === "PROVIDER" ? "secondary" : "outline"
            }
          >
            {t(`roles.${r.toLowerCase()}`)}
          </Badge>
        ))}
      </div>
    );
  };

  const getStatusBadge = (status?: UserStatus) => {
    if (!status) return null;
    return status === "ACTIVE" ? (
      <Badge variant="default" className="bg-green-500">
        {t("admin.active")}
      </Badge>
    ) : (
      <Badge variant="destructive">{t("admin.suspended")}</Badge>
    );
  };

  const formatDate = (date?: Date) =>
    date
      ? new Date(date).toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : t("admin.notProvided");

  const formatDateTime = (date: Date) =>
    new Date(date).toLocaleString(isArabic ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (loadingUser) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!detailsUser) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center">
        <User className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{t("admin.userNotFound")}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/users")}>
          <BackIcon className="me-2 h-4 w-4" />
          {t("admin.backToUsers")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Back link */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-1 px-2"
          onClick={() => navigate("/admin/users")}
        >
          <BackIcon className="h-4 w-4" />
          {t("admin.backToUsers")}
        </Button>

        {/* Header card */}
        <div className="mb-6 flex flex-col gap-4 rounded-xl bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src="" />
              <AvatarFallback className="text-lg">
                {detailsUser.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold text-foreground">{detailsUser.name}</h1>
              <p className="text-sm text-muted-foreground">{detailsUser.email}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {getRoleBadge()}
                {getStatusBadge(detailsUser.status)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {detailsUser.status === "ACTIVE" ? (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => setActionDialog({ open: true, action: "suspend" })}
              >
                <Ban className="me-2 h-4 w-4" />
                {t("admin.suspendUser")}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionDialog({ open: true, action: "activate" })}
              >
                <CheckCircle className="me-2 h-4 w-4" />
                {t("admin.activateUser")}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserCog className="me-2 h-4 w-4" />
                  {t("admin.editUser")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openEditDialog}>
                  <Pencil className="me-2 h-4 w-4" />
                  {t("admin.editUser")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openRoleDialog}>
                  <UserCog className="me-2 h-4 w-4" />
                  {t("admin.changeRole")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setDeleteDialog({ open: true, confirmed: false })}
                >
                  <Trash2 className="me-2 h-4 w-4" />
                  {t("admin.deleteAccount")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t("admin.tabOverview")}</TabsTrigger>
            <TabsTrigger value="reviews">
              {t("admin.tabReviews")} ({reviews.length})
            </TabsTrigger>
            <TabsTrigger value="chats">
              {t("admin.tabChats")} ({userChats.length})
            </TabsTrigger>
          </TabsList>

          {/* ===== Overview ===== */}
          <TabsContent value="overview" className="mt-4 space-y-6">
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">
                {t("admin.personalInfo")}
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">{t("profile.fullName")}</p>
                  <p className="text-sm font-medium">
                    {detailsUser.displayName || detailsUser.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("profile.email")}</p>
                  <p className="text-sm font-medium">{detailsUser.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("profile.phone")}</p>
                  <p className="text-sm font-medium">
                    {detailsUser.phone || t("admin.notProvided")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("admin.role")}</p>
                  <div className="mt-1">{getRoleBadge()}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("admin.status")}</p>
                  <div className="mt-1">{getStatusBadge(detailsUser.status)}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("admin.joinedAt")}</p>
                  <p className="text-sm font-medium">{formatDate(detailsUser.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("admin.lastLogin")}</p>
                  <p className="text-sm font-medium">{formatDate(detailsUser.lastLoginAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("admin.orderCount")}</p>
                  <p className="text-sm font-medium">{activityCounts?.bookingCount ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("admin.reportCount")}</p>
                  <p className="text-sm font-medium">{activityCounts?.reportCount ?? "—"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">{t("admin.userId")}</p>
                  <p className="text-sm font-medium break-all">{detailsUser.uid}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">
                {t("admin.locationInfo")}
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">{t("profile.region")}</p>
                  <p className="text-sm font-medium">
                    {getRegionLabel(
                      providerProfile?.region || detailsUser.region || "",
                      isArabic,
                    ) || t("admin.notProvided")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("profile.city")}</p>
                  <p className="text-sm font-medium">
                    {getCityLabel(
                      providerProfile?.city || detailsUser.city || "",
                      isArabic,
                    ) || t("admin.notProvided")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("profile.district")}</p>
                  <p className="text-sm font-medium">
                    {getDistrictLabel(
                      providerProfile?.area || detailsUser.district || "",
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
                          <Badge variant="default">{t("provider.verified")}</Badge>
                        ) : (
                          <Badge variant="outline">{t("admin.notVerified")}</Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.ratingSummary")}
                      </p>
                      <p className="text-sm font-medium">
                        {(Number(providerProfile.ratingAvg) || 0).toFixed(1)} (
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
                      <p className="text-xs text-muted-foreground">{t("admin.travelFee")}</p>
                      <p className="text-sm font-medium">
                        {providerProfile.travelFeeBase !== undefined &&
                        providerProfile.travelFeeBase !== null
                          ? `${providerProfile.travelFeeBase} SAR`
                          : t("admin.notProvided")}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">{t("profile.bio")}</p>
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
                      {providerProfile.bankAccountHolder || t("admin.notProvided")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("profile.bankName")}</p>
                    <p className="text-sm font-medium">
                      {providerProfile.bankName || t("admin.notProvided")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("profile.accountNumber")}
                    </p>
                    <p className="text-sm font-medium break-all">
                      {providerProfile.bankAccountNumber || t("admin.notProvided")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("profile.iban")}</p>
                    <p className="text-sm font-medium break-all">
                      {providerProfile.bankIBAN || t("admin.notProvided")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(isProviderDetails || isClientDetails || detailPayments.length > 0) && (
              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("admin.paymentsSummary")}
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.totalPayments")}
                    </p>
                    <p className="text-sm font-medium">{detailPayments.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("admin.totalAmount")}</p>
                    <p className="text-sm font-medium">{totalAmount.toFixed(2)} SAR</p>
                  </div>
                  {isProviderDetails && (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("admin.capturedTotal")}
                        </p>
                        <p className="text-sm font-medium">{capturedTotal.toFixed(2)} SAR</p>
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
                    <p className="text-sm text-muted-foreground">{t("admin.noPayments")}</p>
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
                            {(Number(payment.amountSar || payment.amount) || 0).toFixed(2)} SAR
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ===== Reviews ===== */}
          <TabsContent value="reviews" className="mt-4 space-y-3">
            {loadingReviews ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Star className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">{t("adminReviews.noReviews")}</p>
                </CardContent>
              </Card>
            ) : (
              reviews.map((review) => (
                <Card key={review.id} className={review.hidden ? "opacity-60" : undefined}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {review.rating}
                          </Badge>
                          {!isProviderDetails && (
                            <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              {review.clientName || t("adminReviews.anonymous")}
                            </span>
                          )}
                          {review.serviceName && (
                            <Badge variant="outline">{review.serviceName}</Badge>
                          )}
                          {review.hidden && (
                            <Badge variant="destructive" className="gap-1">
                              <EyeOff className="h-3 w-3" />
                              {t("adminReviews.hiddenBadge")}
                            </Badge>
                          )}
                        </div>

                        {review.bookingId && (
                          <p className="mb-1 text-xs text-muted-foreground">
                            {t("admin.orderRef")}:{" "}
                            <span className="font-mono text-foreground">
                              {review.bookingId}
                            </span>
                          </p>
                        )}

                        <StarRating rating={review.rating} size="sm" readOnly />

                        {review.comment && (
                          <p className="mt-2 text-sm italic text-foreground">
                            "{review.comment}"
                          </p>
                        )}

                        {review.providerReply && (
                          <div className="mt-3 rounded-lg border-s-2 border-primary bg-muted/50 p-3">
                            <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                              <Reply className="h-3.5 w-3.5" />
                              {t("adminReviews.providerReply")}
                            </span>
                            <p className="text-sm text-foreground">{review.providerReply}</p>
                          </div>
                        )}

                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDate(review.createdAt)}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        {review.hidden ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => setReviewAction({ review, type: "restore" })}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {t("adminReviews.restoreReview")}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => setReviewAction({ review, type: "hide" })}
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            {t("adminReviews.hideReview")}
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-1"
                          onClick={() => setReviewAction({ review, type: "delete" })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t("adminReviews.deleteReview")}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ===== Chats ===== */}
          <TabsContent value="chats" className="mt-4">
            {userChats.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">{t("admin.noChats")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {userChats.map((chat) => {
                  const isClientSide = chat.clientId === uid;
                  const otherName = isClientSide ? chat.providerName : chat.clientName;
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => setViewingChat(chat)}
                      className="flex w-full items-center justify-between rounded-xl bg-card p-4 text-start transition-colors hover:bg-card/80"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {otherName || t("admin.notProvided")}
                        </p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {chat.lastMessage || t("admin.noMessagesYet")}
                        </p>
                        {chat.bookingId && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("admin.orderRef")}: {chat.bookingId}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {chat.lastMessageAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(chat.lastMessageAt)}
                          </span>
                        )}
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Conversation thread dialog */}
      <Dialog open={!!viewingChat} onOpenChange={(open) => !open && setViewingChat(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {viewingChat?.clientName} ↔ {viewingChat?.providerName}
            </DialogTitle>
            <DialogDescription>
              {viewingChat?.bookingId
                ? `${t("admin.orderRef")}: ${viewingChat.bookingId}`
                : t("admin.noOrderLinked")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 border-b border-border pb-3 sm:grid-cols-2">
            {viewingChat &&
              [
                { participantUid: viewingChat.clientId, roleLabel: t("roles.client") },
                { participantUid: viewingChat.providerId, roleLabel: t("roles.provider") },
              ].map(({ participantUid, roleLabel }) => {
                const person = usersByUid.get(participantUid);
                return (
                  <div key={participantUid} className="rounded-lg bg-muted/50 p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <Badge variant="outline">{roleLabel}</Badge>
                      {participantUid !== uid && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 px-1.5 text-xs text-destructive hover:text-destructive"
                          onClick={() =>
                            setSuspendTarget({
                              uid: participantUid,
                              label: person?.name || roleLabel,
                            })
                          }
                        >
                          <Ban className="h-3 w-3" />
                          {t("admin.suspend")}
                        </Button>
                      )}
                    </div>
                    <p className="font-medium text-foreground">
                      {person?.name || t("admin.notProvided")}
                    </p>
                    {person?.phone && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {person.phone}
                      </p>
                    )}
                    {person?.email && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" /> {person.email}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>

          <ScrollArea className="flex-1 pe-2">
            {loadingViewingMessages ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : viewingMessages.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                {t("admin.noMessagesYet")}
              </p>
            ) : (
              <div className="space-y-2 py-3">
                {viewingMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start justify-between gap-2 rounded-lg p-3 ${
                      message.flaggedContactInfo
                        ? "bg-amber-50 dark:bg-amber-900/20"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {message.senderId === viewingChat?.clientId
                          ? viewingChat?.clientName || t("roles.client")
                          : viewingChat?.providerName || t("roles.provider")}
                        <span>•</span>
                        {formatDateTime(message.createdAt)}
                        {message.flaggedContactInfo && (
                          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-3 w-3" />
                            {t("admin.flaggedContactInfo")}
                          </span>
                        )}
                      </div>
                      {message.type === "IMAGE" ? (
                        <img
                          src={message.imageUrl}
                          alt="attachment"
                          className="mt-1 h-24 w-24 rounded-lg object-cover"
                        />
                      ) : (
                        <p className="mt-1 break-words text-sm text-foreground">
                          {message.text}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() =>
                        viewingChat &&
                        setMessageToDelete({ chatId: viewingChat.id, messageId: message.id })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingChat(null)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete message confirmation */}
      <Dialog
        open={!!messageToDelete}
        onOpenChange={(open) => !open && setMessageToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.deleteMessageTitle")}</DialogTitle>
            <DialogDescription>{t("admin.deleteMessageWarning")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMessageToDelete(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMessage}
              disabled={deleteMessageMutation.isPending}
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend chat participant confirmation */}
      <Dialog open={!!suspendTarget} onOpenChange={(open) => !open && setSuspendTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.suspendTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.suspendDescription", { name: suspendTarget?.label })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSuspendTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmSuspendParticipant}
              disabled={suspendMutation.isPending}
            >
              {t("admin.suspend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review hide/restore/delete confirmation */}
      <Dialog open={!!reviewAction} onOpenChange={(open) => !open && setReviewAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction?.type === "delete"
                ? t("adminReviews.deleteReviewTitle")
                : reviewAction?.type === "hide"
                  ? t("adminReviews.hideReviewTitle")
                  : t("adminReviews.restoreReviewTitle")}
            </DialogTitle>
            <DialogDescription>
              {reviewAction?.type === "delete"
                ? t("adminReviews.deleteReviewDescription")
                : reviewAction?.type === "hide"
                  ? t("adminReviews.hideReviewDescription")
                  : t("adminReviews.restoreReviewDescription")}
            </DialogDescription>
          </DialogHeader>
          {reviewAction && (
            <div className="rounded-lg bg-muted p-3 text-sm italic">
              "{reviewAction.review.comment || t("adminReviews.noComment")}"
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setReviewAction(null)}
              disabled={deleteReviewMutation.isPending || setReviewHiddenMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant={reviewAction?.type === "restore" ? "default" : "destructive"}
              onClick={confirmReviewAction}
              disabled={deleteReviewMutation.isPending || setReviewHiddenMutation.isPending}
            >
              {reviewAction?.type === "delete"
                ? t("common.delete")
                : reviewAction?.type === "hide"
                  ? t("adminReviews.hideReview")
                  : t("adminReviews.restoreReview")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.editUser")}</DialogTitle>
            <DialogDescription>{detailsUser.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("profile.fullName")}</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">{t("profile.phone")}</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city">{t("profile.city")}</Label>
              <Input
                id="edit-city"
                value={editForm.city}
                onChange={(e) => setEditForm((prev) => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-region">{t("profile.region")}</Label>
              <Input
                id="edit-region"
                value={editForm.region}
                onChange={(e) => setEditForm((prev) => ({ ...prev, region: e.target.value }))}
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
            <Button onClick={confirmEditUser} disabled={updateProfileMutation.isPending}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete account dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, confirmed: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {t("admin.deleteAccountTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.deleteAccountWarning", { name: detailsUser.name })}
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
              onClick={() => setDeleteDialog({ open: false, confirmed: false })}
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

      {/* Change role dialog */}
      <Dialog
        open={roleDialog.open}
        onOpenChange={(open) => setRoleDialog({ open, newRole: roleDialog.newRole })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.changeRoleTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.changeRoleDescription", { name: detailsUser.name })}
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
              onClick={() => setRoleDialog({ open: false, newRole: "CLIENT" })}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={confirmRoleChange} disabled={updateRoleMutation.isPending}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend/Activate confirmation */}
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
                ? t("admin.suspendDescription", { name: detailsUser.name })
                : t("admin.activateDescription", { name: detailsUser.name })}
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
              variant={actionDialog.action === "suspend" ? "destructive" : "default"}
              onClick={confirmAction}
              disabled={updateStatusMutation.isPending}
            >
              {actionDialog.action === "suspend" ? t("admin.suspend") : t("admin.activate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserDetailPage;
