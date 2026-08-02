import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Clock,
  MapPin,
  DollarSign,
  ImagePlus,
  X,
  Loader2,
  Shield,
  Lock,
  UserCog,
} from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import {
  useProviderServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
} from "@/hooks/queries/useServices";
import { useCategories } from "@/hooks/queries/useCategories";
import { useProviderProfile } from "@/hooks/queries/useProviders";
import { toast } from "@/components/ui/sonner";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Service, LocationType } from "@/types";
import { parseDurationToMinutes, formatServiceDuration } from "@/lib/duration";
import { z } from "zod";

const ProviderServicesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, firebaseUser } = useAuth();
  const navigate = useNavigate();
  const { isLocked, canPublish } = useSubscriptionStatus();
  const isArabic = i18n.language === "ar";
  const [isSendingVerification, setIsSendingVerification] =
    React.useState(false);

  // State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state. `duration` is free text ("ساعتين", "1.5") — it is parsed into
  // minutes on save because bookings need a numeric length.
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    categoryId: "",
    customCategory: "",
    price: "",
    duration: "",
    locationType: "AT_PROVIDER" as LocationType,
    mediaUrls: [] as string[],
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch data
  const { data: services = [], isLoading } = useProviderServices(
    user?.uid || "",
  );
  const { data: categories = [] } = useCategories();
  const { data: providerProfile } = useProviderProfile(user?.uid || "");

  const isProfileComplete = !!(
    (providerProfile?.displayName || user?.name) &&
    providerProfile?.phone &&
    providerProfile?.region &&
    providerProfile?.city &&
    providerProfile?.area &&
    providerProfile?.bio
  );

  // Mutations
  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      categoryId: "",
      customCategory: "",
      price: "",
      duration: "",
      locationType: "AT_PROVIDER",
      mediaUrls: [],
    });
    setFormErrors({});
    setEditingService(null);
  };

  const openAddForm = () => {
    if (isLocked) {
      toast.error(t("provider.accountLockedTitle"), {
        description: t("provider.accountLockedMessage"),
      });
      return;
    }
    // No live subscription → no new ads.
    if (!canPublish) {
      toast.error(t("services.subscriptionRequiredTitle"), {
        description: t("services.subscriptionRequiredDescription"),
      });
      navigate("/provider/subscription");
      return;
    }
    if (!isProfileComplete) {
      toast.error(t("services.profileIncompleteTitle"), {
        description: t("services.profileIncompleteDescription"),
      });
      return;
    }
    // Check if email is verified
    if (!firebaseUser?.emailVerified) {
      toast.error(t("services.emailVerificationRequiredTitle"), {
        description: t("services.emailVerificationRequiredDescription"),
      });
      return;
    }
    resetForm();
    setIsFormOpen(true);
  };

  const handleResendVerification = async () => {
    if (!firebaseUser || isSendingVerification) return;
    setIsSendingVerification(true);
    try {
      await sendEmailVerification(firebaseUser);
      toast.success(t("auth.verificationEmailSent"));
    } catch (error) {
      toast.error(t("auth.verificationEmailError"));
    } finally {
      setIsSendingVerification(false);
    }
  };

  const openEditForm = (service: Service) => {
    if (!canPublish) {
      toast.error(t("services.subscriptionRequiredTitle"), {
        description: t("services.subscriptionRequiredDescription"),
      });
      navigate("/provider/subscription");
      return;
    }
    const matchedCategory = categories.find((c) => c.id === service.categoryId);
    const isCustomCategory = !matchedCategory && !!service.categoryId;
    setEditingService(service);
    setFormData({
      title: service.title,
      description: service.description,
      categoryId: isCustomCategory ? "__custom__" : service.categoryId,
      customCategory: isCustomCategory
        ? service.categoryName || service.categoryId
        : "",
      price: service.price.toString(),
      // Show what the provider originally typed; fall back to the stored minutes.
      duration: formatServiceDuration(service, t("services.hourUnit")),
      locationType: service.locationType,
      mediaUrls: service.mediaUrls || [],
    });
    setIsFormOpen(true);
  };

  const slugifyCategory = (value: string) => {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    // Limit to 5 images total
    const remainingSlots = 5 - formData.mediaUrls.length;
    if (remainingSlots <= 0) {
      toast.error(t("services.maxImagesReached"));
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          throw new Error("Invalid file type");
        }
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("File too large");
        }

        const timestamp = Date.now();
        const fileName = `services/${user.uid}/${timestamp}-${file.name}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
      });

      const newUrls = await Promise.all(uploadPromises);
      setFormData((prev) => ({
        ...prev,
        mediaUrls: [...prev.mediaUrls, ...newUrls],
      }));
      toast.success(t("services.imagesUploaded"));
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(t("services.uploadFailed"));
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      mediaUrls: prev.mediaUrls.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Clear previous errors
    setFormErrors({});
    const errors: Record<string, string> = {};

    // Validate fields
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      errors.title = t("services.errors.titleRequired");
    }
    if (
      !formData.description.trim() ||
      formData.description.trim().length < 10
    ) {
      errors.description = t("services.errors.descriptionRequired");
    }
    if (!formData.categoryId) {
      errors.categoryId = t("services.errors.categoryRequired");
    }
    if (
      formData.categoryId === "__custom__" &&
      !formData.customCategory.trim()
    ) {
      errors.customCategory = t("services.errors.customCategoryRequired");
    }

    const parsedPrice = parseFloat(formData.price);
    if (!formData.price || isNaN(parsedPrice) || parsedPrice < 1) {
      errors.price = t("services.errors.priceRequired");
    }

    // Duration is free text; only its presence is required. It is converted to
    // minutes so the booking flow can still compute an end time.
    const durationText = formData.duration.trim();
    const parsedDuration = parseDurationToMinutes(durationText);
    if (!durationText) {
      errors.duration = t("services.errors.durationRequired");
    }

    // If there are errors, show them and stop
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(t("common.error"), {
        description: t("services.validationError"),
      });
      return;
    }

    const serviceSchema = z.object({
      title: z.string().min(3),
      description: z.string().min(10),
      categoryId: z.string().min(1),
      price: z.number().min(1),
      durationMin: z.number().min(15),
      locationType: z.enum(["AT_PROVIDER", "AT_CLIENT", "BOTH"]),
    });

    const isCustom = formData.categoryId === "__custom__";
    const customCategoryName = formData.customCategory.trim();

    if (isCustom && !customCategoryName) {
      toast.error(t("common.error"), {
        description: t("services.validationError"),
      });
      return;
    }

    const resolvedCategoryId = isCustom
      ? slugifyCategory(customCategoryName)
      : formData.categoryId;

    if (isCustom && !resolvedCategoryId) {
      toast.error(t("common.error"), {
        description: t("services.validationError"),
      });
      return;
    }

    const selectedCategory = categories.find(
      (category) => category.id === formData.categoryId,
    );

    const resolvedCategoryName = isCustom
      ? customCategoryName
      : selectedCategory
        ? isArabic
          ? selectedCategory.nameAr
          : selectedCategory.nameEn
        : "";

    const validation = serviceSchema.safeParse({
      title: formData.title.trim(),
      description: formData.description.trim(),
      categoryId: resolvedCategoryId,
      price: parsedPrice,
      durationMin: parsedDuration,
      locationType: formData.locationType,
    });

    if (!validation.success) {
      toast.error(t("common.error"), {
        description: t("services.validationError"),
      });
      return;
    }

    const serviceData = {
      title: validation.data.title,
      description: validation.data.description,
      categoryId: validation.data.categoryId,
      categoryName: resolvedCategoryName || undefined,
      price: validation.data.price,
      durationMin: validation.data.durationMin,
      durationText,
      locationType: validation.data.locationType,
      providerId: user.uid,
      isActive: true,
      deactivatedBySubscription: false,
      mediaUrls: formData.mediaUrls,
    };

    try {
      if (editingService) {
        await updateServiceMutation.mutateAsync({
          id: editingService.id,
          updates: serviceData,
        });
      } else {
        await createServiceMutation.mutateAsync(serviceData);
      }
      setIsFormOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save service:", error);
    }
  };

  const handleDelete = async () => {
    if (!serviceToDelete) return;

    try {
      await deleteServiceMutation.mutateAsync(serviceToDelete.id);
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    } catch (error) {
      console.error("Failed to delete service:", error);
    }
  };

  const handleToggleActive = async (service: Service) => {
    // Re-publishing requires a live subscription; turning an ad off is always allowed.
    if (!service.isActive && !canPublish) {
      toast.error(t("services.subscriptionRequiredTitle"), {
        description: t("services.subscriptionRequiredDescription"),
      });
      return;
    }
    try {
      await updateServiceMutation.mutateAsync({
        id: service.id,
        updates: {
          isActive: !service.isActive,
          // A manual toggle clears the auto-hidden flag: from now on this is the
          // provider's own choice, and a renewal must not override it.
          deactivatedBySubscription: false,
        },
      });
    } catch (error) {
      console.error("Failed to toggle service:", error);
    }
  };

  const getLocationTypeLabel = (type: LocationType) => {
    switch (type) {
      case "AT_PROVIDER":
        return t("services.atProvider");
      case "AT_CLIENT":
        return t("services.atClient");
      case "BOTH":
        return t("services.both");
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Check if email verification is needed
  const needsEmailVerification = firebaseUser && !firebaseUser.emailVerified;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-semibold text-foreground">
            {t("nav.services")}
          </h1>
          <Button
            onClick={openAddForm}
            size="sm"
            className="gap-2"
            disabled={
              !isProfileComplete ||
              isLocked ||
              !canPublish ||
              needsEmailVerification
            }
          >
            <Plus className="h-4 w-4" />
            {t("services.addService")}
          </Button>
        </div>
      </header>

      <main className="container py-4">
        {/* Subscription required — ads are hidden and no new ones can be added */}
        {!canPublish && !isLocked && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30"
          >
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div className="flex-1">
                <h3 className="font-medium text-red-800 dark:text-red-200">
                  {t("services.subscriptionRequiredTitle")}
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {t("services.servicesHiddenDescription")}
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate("/provider/subscription")}
                >
                  {t("provider.subscribeNow")}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Profile Incomplete Banner — required fields (phone/region/city/area/bio)
            are silently required to publish; without this banner the add-service
            buttons are just disabled with no explanation. */}
        {canPublish && !isLocked && !isProfileComplete && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
          >
            <div className="flex items-start gap-3">
              <UserCog className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-amber-800 dark:text-amber-200">
                  {t("services.profileIncompleteTitle")}
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {t("services.profileIncompleteDescription")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
                  onClick={() => navigate("/provider/profile")}
                >
                  <UserCog className="h-4 w-4 mr-2" />
                  {t("services.completeProfileButton")}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Email Verification Banner */}
        {needsEmailVerification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
          >
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-amber-800 dark:text-amber-200">
                  {t("services.emailVerificationRequiredTitle")}
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {t("services.emailVerificationRequiredDescription")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
                  onClick={handleResendVerification}
                  disabled={isSendingVerification}
                >
                  {isSendingVerification ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  {t("services.resendVerificationEmail")}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-12 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{t("services.noServices")}</p>
            <Button
              onClick={openAddForm}
              className="mt-4 gap-2"
              disabled={
                !isProfileComplete ||
                isLocked ||
                !canPublish ||
                needsEmailVerification
              }
            >
              <Plus className="h-4 w-4" />
              {t("services.addFirst")}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            className="space-y-4"
          >
            {services.map((service) => {
              const category = categories.find(
                (c) => c.id === service.categoryId,
              );
              return (
                <motion.div
                  key={service.id}
                  variants={fadeInUp}
                  className="rounded-2xl bg-card p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {service.title}
                        </h3>
                        {!service.isActive &&
                          (service.deactivatedBySubscription ? (
                            <Badge
                              variant="destructive"
                              className="gap-1"
                              title={t("services.hiddenBySubscriptionHint")}
                            >
                              <Lock className="h-3 w-3" />
                              {t("services.hiddenBySubscription")}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {t("services.inactive")}
                            </Badge>
                          ))}
                      </div>

                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {service.description}
                      </p>

                      {/* Category */}
                      {category && (
                        <Badge variant="outline" className="mt-2 gap-1">
                          <CategoryIcon icon={category.icon} size={12} />
                          {isArabic ? category.nameAr : category.nameEn}
                        </Badge>
                      )}

                      {/* Details */}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {service.price} SAR
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatServiceDuration(service, t("services.hourUnit"))}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {getLocationTypeLabel(service.locationType)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={service.isActive}
                        onCheckedChange={() => handleToggleActive(service)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditForm(service)}
                          >
                            <Edit2 className="me-2 h-4 w-4" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setServiceToDelete(service);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="me-2 h-4 w-4" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>

      {/* Add/Edit Service Sheet */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent
          side={isArabic ? "left" : "right"}
          className="overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>
              {editingService
                ? t("services.editService")
                : t("services.addService")}
            </SheetTitle>
            <SheetDescription>
              {editingService
                ? t("services.editServiceDescription")
                : t("services.addServiceDescription")}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">
                {t("services.title")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (formErrors.title)
                    setFormErrors({ ...formErrors, title: "" });
                }}
                placeholder={t("services.titlePlaceholder")}
                className={`mt-1 ${formErrors.title ? "border-destructive" : ""}`}
              />
              {formErrors.title && (
                <p className="mt-1 text-xs text-destructive">
                  {formErrors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">
                {t("services.description")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (formErrors.description)
                    setFormErrors({ ...formErrors, description: "" });
                }}
                placeholder={t("services.descriptionPlaceholder")}
                className={`mt-1 ${formErrors.description ? "border-destructive" : ""}`}
                rows={3}
              />
              {formErrors.description && (
                <p className="mt-1 text-xs text-destructive">
                  {formErrors.description}
                </p>
              )}
            </div>

            {/* Service Images */}
            <div>
              <Label>{t("services.images")}</Label>
              <p className="mb-2 text-xs text-muted-foreground">
                {t("services.imagesHint")}
              </p>

              {/* Image Preview Grid */}
              {formData.mediaUrls.length > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {formData.mediaUrls.map((url, index) => (
                    <div key={index} className="group relative aspect-square">
                      <img
                        src={url}
                        alt={`Service ${index + 1}`}
                        className="h-full w-full rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              {formData.mediaUrls.length < 5 && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="service-images"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("services.uploading")}
                      </>
                    ) : (
                      <>
                        <ImagePlus className="mr-2 h-4 w-4" />
                        {t("services.addImages")}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <Label>
                {t("services.category")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => {
                  setFormData({ ...formData, categoryId: value });
                  if (formErrors.categoryId)
                    setFormErrors({ ...formErrors, categoryId: "" });
                }}
              >
                <SelectTrigger
                  className={`mt-1 ${formErrors.categoryId ? "border-destructive" : ""}`}
                >
                  <SelectValue placeholder={t("services.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom__">
                    {t("services.customCategory")}
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      className="flex items-center gap-2"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <CategoryIcon icon={category.icon} size={14} />
                        {isArabic ? category.nameAr : category.nameEn}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.categoryId && (
                <p className="mt-1 text-xs text-destructive">
                  {formErrors.categoryId}
                </p>
              )}
            </div>

            {formData.categoryId === "__custom__" && (
              <div>
                <Label htmlFor="customCategory">
                  {t("services.customCategory")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customCategory"
                  value={formData.customCategory}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      customCategory: e.target.value,
                    });
                    if (formErrors.customCategory)
                      setFormErrors({ ...formErrors, customCategory: "" });
                  }}
                  placeholder={t("services.customCategoryPlaceholder")}
                  className={`mt-1 ${formErrors.customCategory ? "border-destructive" : ""}`}
                />
                {formErrors.customCategory && (
                  <p className="mt-1 text-xs text-destructive">
                    {formErrors.customCategory}
                  </p>
                )}
              </div>
            )}

            {/* Price */}
            <div>
              <Label htmlFor="price">
                {t("services.price")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => {
                  setFormData({ ...formData, price: e.target.value });
                  if (formErrors.price)
                    setFormErrors({ ...formErrors, price: "" });
                }}
                placeholder="0"
                className={`mt-1 ${formErrors.price ? "border-destructive" : ""}`}
              />
              {formErrors.price && (
                <p className="mt-1 text-xs text-destructive">
                  {formErrors.price}
                </p>
              )}
            </div>

            {/* Duration — free text, in hours */}
            <div>
              <Label htmlFor="duration">
                {t("services.duration")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="duration"
                type="text"
                value={formData.duration}
                onChange={(e) => {
                  setFormData({ ...formData, duration: e.target.value });
                  if (formErrors.duration)
                    setFormErrors({ ...formErrors, duration: "" });
                }}
                placeholder={t("services.durationPlaceholder")}
                className={`mt-1 ${formErrors.duration ? "border-destructive" : ""}`}
              />
              {formErrors.duration && (
                <p className="mt-1 text-xs text-destructive">
                  {formErrors.duration}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {t("services.durationHint")}
              </p>
            </div>

            {/* Location Type */}
            <div>
              <Label>{t("services.locationType")}</Label>
              <Select
                value={formData.locationType}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    locationType: value as LocationType,
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AT_PROVIDER">
                    {t("services.atProvider")}
                  </SelectItem>
                  <SelectItem value="AT_CLIENT">
                    {t("services.atClient")}
                  </SelectItem>
                  <SelectItem value="BOTH">{t("services.both")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={
                !formData.title ||
                !formData.categoryId ||
                (formData.categoryId === "__custom__" &&
                  !formData.customCategory.trim()) ||
                !formData.price ||
                !formData.duration.trim() ||
                createServiceMutation.isPending ||
                updateServiceMutation.isPending
              }
            >
              {editingService ? t("common.save") : t("services.addService")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("services.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("services.deleteDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteServiceMutation.isPending}
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderServicesPage;
