import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  ImageIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  FolderOpen,
  Settings,
  Phone,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useBanner,
  useUpdateBanner,
  useProviderBanner,
  useUpdateProviderBanner,
} from "@/hooks/queries/useBanner";
import {
  useSubscriptionSettings,
  useUpdateSubscriptionSettings,
} from "@/hooks/queries/useSubscriptionSettings";
import {
  useAllCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/queries/useCategories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { forceReseedCategories } from "@/lib/firestore";
import { toast } from "@/components/ui/sonner";
import { BannerSettings, ProviderBannerSettings, Category } from "@/types";

const AdminSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();

  const { data: categories = [], isLoading: loadingCategories } =
    useAllCategories();
  const { data: banner } = useBanner();
  const updateBanner = useUpdateBanner();
  const { data: providerBanner } = useProviderBanner();
  const updateProviderBanner = useUpdateProviderBanner();
  const { data: subscriptionSettings } = useSubscriptionSettings();
  const updateSubscriptionSettings = useUpdateSubscriptionSettings();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  // Banner form state (client)
  const [bannerForm, setBannerForm] = useState<Partial<BannerSettings>>({});

  // Provider Banner form state
  const [providerBannerForm, setProviderBannerForm] = useState<
    Partial<ProviderBannerSettings>
  >({});

  // Subscription settings form state
  const [subscriptionForm, setSubscriptionForm] = useState({
    monthlyPrice: 99,
    trialDays: 0,
    plans: [
      { id: "monthly", months: 1, price: 10, discountPercent: 0, isActive: true },
      { id: "half-yearly", months: 6, price: 50, discountPercent: 15, isActive: true },
      { id: "yearly", months: 12, price: 96, discountPercent: 20, isActive: true },
    ] as Array<{
      id: string;
      months: number;
      price: number;
      discountPercent: number;
      isActive: boolean;
    }>,
  });

  // Contact info form state
  const [contactForm, setContactForm] = useState({
    contactEmail: "",
    contactPhone: "",
    contactWhatsapp: "",
  });

  // Category management state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategoryDialog, setDeleteCategoryDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isUploadingCategoryImage, setIsUploadingCategoryImage] = useState(false);
  const categoryImageInputRef = useRef<HTMLInputElement>(null);
  const [categoryForm, setCategoryForm] = useState({
    nameEn: "",
    nameAr: "",
    icon: "",
    imageUrl: "",
    isActive: true,
  });
  const [reseedConfirmOpen, setReseedConfirmOpen] = useState(false);

  // Initialize banner form when data loads
  React.useEffect(() => {
    if (banner && Object.keys(bannerForm).length === 0) {
      setBannerForm(banner);
    }
  }, [banner]);

  // Initialize provider banner form when data loads
  React.useEffect(() => {
    if (providerBanner && Object.keys(providerBannerForm).length === 0) {
      setProviderBannerForm(providerBanner);
    }
  }, [providerBanner]);

  // Initialize subscription form when data loads
  React.useEffect(() => {
    if (subscriptionSettings) {
      setSubscriptionForm({
        monthlyPrice: subscriptionSettings.monthlyPrice ?? 99,
        trialDays: subscriptionSettings.trialDays ?? 0,
        plans: subscriptionSettings.plans || [
          { id: "monthly", months: 1, price: 10, discountPercent: 0, isActive: true },
          { id: "half-yearly", months: 6, price: 50, discountPercent: 15, isActive: true },
          { id: "yearly", months: 12, price: 96, discountPercent: 20, isActive: true },
        ],
      });
      setContactForm({
        contactEmail: subscriptionSettings.contactEmail || "",
        contactPhone: subscriptionSettings.contactPhone || "",
        contactWhatsapp: subscriptionSettings.contactWhatsapp || "",
      });
    }
  }, [subscriptionSettings]);

  const handleBannerUpdate = async () => {
    try {
      await updateBanner.mutateAsync(bannerForm);
      toast.success(t("admin.bannerUpdated"));
    } catch (error) {
      console.error("Failed to update banner:", error);
      toast.error(t("common.error"));
    }
  };

  const handleProviderBannerUpdate = async () => {
    try {
      await updateProviderBanner.mutateAsync(providerBannerForm);
      toast.success(t("admin.providerBannerUpdated"));
    } catch (error) {
      console.error("Failed to update provider banner:", error);
      toast.error(t("common.error"));
    }
  };

  const handleSubscriptionUpdate = async () => {
    try {
      await updateSubscriptionSettings.mutateAsync(subscriptionForm);
      toast.success(t("admin.subscriptionUpdated"));
    } catch (error) {
      console.error("Failed to update subscription settings:", error);
      toast.error(t("common.error"));
    }
  };

  const handleContactUpdate = async () => {
    try {
      await updateSubscriptionSettings.mutateAsync(contactForm);
      toast.success(t("admin.contactUpdated"));
    } catch (error) {
      console.error("Failed to update contact info:", error);
      toast.error(t("common.error"));
    }
  };

  // Category management handlers
  const resetCategoryForm = () => {
    setCategoryForm({ nameEn: "", nameAr: "", icon: "", imageUrl: "", isActive: true });
    setEditingCategory(null);
  };

  const openAddCategory = () => {
    resetCategoryForm();
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      nameEn: category.nameEn,
      nameAr: category.nameAr,
      icon: category.icon || "",
      imageUrl: category.imageUrl || "",
      isActive: category.isActive,
    });
    setCategoryDialogOpen(true);
  };

  const handleCategoryImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("admin.invalidImageType"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("admin.imageTooLarge"));
      return;
    }

    setIsUploadingCategoryImage(true);
    try {
      const timestamp = Date.now();
      const fileName = `categories/${timestamp}-${file.name}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setCategoryForm((prev) => ({ ...prev, imageUrl: url }));
      toast.success(t("admin.imageUploaded"));
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(t("admin.uploadFailed"));
    } finally {
      setIsUploadingCategoryImage(false);
      if (categoryImageInputRef.current) {
        categoryImageInputRef.current.value = "";
      }
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.nameEn.trim() || !categoryForm.nameAr.trim()) {
      toast.error(t("admin.categoryNameRequired"));
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          updates: {
            nameEn: categoryForm.nameEn.trim(),
            nameAr: categoryForm.nameAr.trim(),
            icon: categoryForm.icon.trim(),
            imageUrl: categoryForm.imageUrl,
            isActive: categoryForm.isActive,
          },
        });
        toast.success(t("admin.categoryUpdated"));
      } else {
        await createCategory.mutateAsync({
          nameEn: categoryForm.nameEn.trim(),
          nameAr: categoryForm.nameAr.trim(),
          icon: categoryForm.icon.trim(),
          imageUrl: categoryForm.imageUrl,
          isActive: categoryForm.isActive,
        });
        toast.success(t("admin.categoryCreated"));
      }
      setCategoryDialogOpen(false);
      resetCategoryForm();
    } catch (error) {
      console.error("Failed to save category:", error);
      toast.error(t("common.error"));
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      await deleteCategoryMutation.mutateAsync(categoryToDelete.id);
      toast.success(t("admin.categoryDeleted"));
      setDeleteCategoryDialog(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast.error(t("common.error"));
    }
  };

  const handleSeedCategories = async () => {
    try {
      await forceReseedCategories();
      toast.success(t("admin.categoriesSeeded"));
      window.location.reload();
    } catch (error) {
      console.error("Failed to seed categories:", error);
      toast.error(t("common.error"));
    } finally {
      setReseedConfirmOpen(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="mb-6 text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
        {t("admin.settingsTitle")}
      </h1>

      {/* Categories management */}
      <Card className="mb-6">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FolderOpen className="h-5 w-5" />
            {t("admin.categoriesManagement")}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={() => setReseedConfirmOpen(true)}
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
            >
              {t("admin.reseedCategories")}
            </Button>
            <Button onClick={openAddCategory} size="sm" className="text-xs sm:text-sm">
              <Plus className="h-4 w-4 me-1" />
              {t("admin.addCategory")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            {t("admin.categoriesCount", { count: categories.length })}
          </p>

          {loadingCategories ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {t("admin.noCategories")}
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      {category.imageUrl ? (
                        <img
                          src={category.imageUrl}
                          alt={category.nameEn}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <CategoryIcon
                            icon={category.icon}
                            size={20}
                            className="text-primary"
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          {i18n.language === "ar" ? category.nameAr : category.nameEn}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {i18n.language === "ar" ? category.nameEn : category.nameAr}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={category.isActive ? "default" : "secondary"}>
                        {category.isActive ? t("admin.active") : t("admin.inactive")}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditCategory(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCategoryToDelete(category);
                          setDeleteCategoryDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Category Add/Edit Dialog */}
      <Dialog
        open={categoryDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetCategoryForm();
          setCategoryDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t("admin.editCategory") : t("admin.addCategory")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t("admin.categoryImage")}</Label>
              <div className="mt-2 flex items-center gap-4">
                {categoryForm.imageUrl ? (
                  <div className="group relative">
                    <img
                      src={categoryForm.imageUrl}
                      alt="Category"
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCategoryForm((prev) => ({ ...prev, imageUrl: "" }))
                      }
                      className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed">
                    <CategoryIcon
                      icon={categoryForm.icon}
                      size={32}
                      className="text-muted-foreground"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={categoryImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCategoryImageUpload}
                    className="hidden"
                    id="category-image"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => categoryImageInputRef.current?.click()}
                    disabled={isUploadingCategoryImage}
                  >
                    {isUploadingCategoryImage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("common.uploading")}
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        {t("admin.uploadImage")}
                      </>
                    )}
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("admin.categoryImageHint")}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="cat-name-en">{t("admin.categoryNameEn")}</Label>
              <Input
                id="cat-name-en"
                value={categoryForm.nameEn}
                onChange={(e) =>
                  setCategoryForm((prev) => ({ ...prev, nameEn: e.target.value }))
                }
                placeholder="e.g. Makeup"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="cat-name-ar">{t("admin.categoryNameAr")}</Label>
              <Input
                id="cat-name-ar"
                value={categoryForm.nameAr}
                onChange={(e) =>
                  setCategoryForm((prev) => ({ ...prev, nameAr: e.target.value }))
                }
                placeholder="مثال: المكياج"
                dir="rtl"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="cat-icon">{t("admin.categoryIcon")}</Label>
              <Input
                id="cat-icon"
                value={categoryForm.icon}
                onChange={(e) =>
                  setCategoryForm((prev) => ({ ...prev, icon: e.target.value }))
                }
                placeholder="e.g. Palette, Scissors, Heart"
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("admin.categoryIconHint")}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="cat-active">{t("admin.categoryActive")}</Label>
              <Switch
                id="cat-active"
                checked={categoryForm.isActive}
                onCheckedChange={(checked) =>
                  setCategoryForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={createCategory.isPending || updateCategory.isPending}
            >
              {(createCategory.isPending || updateCategory.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingCategory ? t("common.save") : t("admin.addCategory")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <Dialog open={deleteCategoryDialog} onOpenChange={setDeleteCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.deleteCategoryTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.deleteCategoryDescription", {
                name: categoryToDelete
                  ? i18n.language === "ar"
                    ? categoryToDelete.nameAr
                    : categoryToDelete.nameEn
                  : "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteCategoryDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCategory}
              disabled={deleteCategoryMutation.isPending}
            >
              {deleteCategoryMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reseed Categories Confirmation — destructive, so it gets its own gate */}
      <Dialog open={reseedConfirmOpen} onOpenChange={setReseedConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("admin.reseedCategoriesTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.reseedCategoriesWarning")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReseedConfirmOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleSeedCategories}>
              {t("admin.reseedCategories")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Banner Management */}
      <Card className="mb-8 border-dashed">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              {t("admin.clientBannerManagement")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("admin.clientBannerHint")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="banner-active" className="text-sm">
              {bannerForm.isActive ? t("admin.bannerActive") : t("admin.bannerInactive")}
            </Label>
            <Switch
              id="banner-active"
              checked={bannerForm.isActive ?? false}
              onCheckedChange={(checked) =>
                setBannerForm((prev) => ({ ...prev, isActive: checked }))
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {bannerForm.isActive && (
            <div
              className="mb-4 rounded-xl p-4"
              style={{
                backgroundColor: bannerForm.backgroundColor || "#7c3aed",
                color: bannerForm.textColor || "#ffffff",
              }}
            >
              <p className="font-bold">
                {i18n.language === "ar" ? bannerForm.titleAr : bannerForm.titleEn}
              </p>
              <p className="text-sm opacity-80">
                {i18n.language === "ar" ? bannerForm.subtitleAr : bannerForm.subtitleEn}
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="banner-title-en">{t("admin.bannerTitleEn")}</Label>
              <Input
                id="banner-title-en"
                value={bannerForm.titleEn || ""}
                onChange={(e) =>
                  setBannerForm((prev) => ({ ...prev, titleEn: e.target.value }))
                }
                placeholder="Summer Sale!"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner-title-ar">{t("admin.bannerTitleAr")}</Label>
              <Input
                id="banner-title-ar"
                value={bannerForm.titleAr || ""}
                onChange={(e) =>
                  setBannerForm((prev) => ({ ...prev, titleAr: e.target.value }))
                }
                placeholder="تخفيضات الصيف!"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner-subtitle-en">{t("admin.bannerSubtitleEn")}</Label>
              <Input
                id="banner-subtitle-en"
                value={bannerForm.subtitleEn || ""}
                onChange={(e) =>
                  setBannerForm((prev) => ({ ...prev, subtitleEn: e.target.value }))
                }
                placeholder="Get 20% off all services"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner-subtitle-ar">{t("admin.bannerSubtitleAr")}</Label>
              <Input
                id="banner-subtitle-ar"
                value={bannerForm.subtitleAr || ""}
                onChange={(e) =>
                  setBannerForm((prev) => ({ ...prev, subtitleAr: e.target.value }))
                }
                placeholder="احصلي على خصم 20% على جميع الخدمات"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner-bg-color">{t("admin.bannerBgColor")}</Label>
              <div className="flex gap-2">
                <Input
                  id="banner-bg-color"
                  type="color"
                  value={bannerForm.backgroundColor || "#7c3aed"}
                  onChange={(e) =>
                    setBannerForm((prev) => ({
                      ...prev,
                      backgroundColor: e.target.value,
                    }))
                  }
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={bannerForm.backgroundColor || "#7c3aed"}
                  onChange={(e) =>
                    setBannerForm((prev) => ({
                      ...prev,
                      backgroundColor: e.target.value,
                    }))
                  }
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner-text-color">{t("admin.bannerTextColor")}</Label>
              <div className="flex gap-2">
                <Input
                  id="banner-text-color"
                  type="color"
                  value={bannerForm.textColor || "#ffffff"}
                  onChange={(e) =>
                    setBannerForm((prev) => ({ ...prev, textColor: e.target.value }))
                  }
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={bannerForm.textColor || "#ffffff"}
                  onChange={(e) =>
                    setBannerForm((prev) => ({ ...prev, textColor: e.target.value }))
                  }
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="banner-link">{t("admin.bannerLink")}</Label>
              <Input
                id="banner-link"
                value={bannerForm.linkUrl || ""}
                onChange={(e) =>
                  setBannerForm((prev) => ({ ...prev, linkUrl: e.target.value }))
                }
                placeholder="/client/search?categories=bridal"
              />
            </div>
          </div>
          <Button
            onClick={handleBannerUpdate}
            disabled={updateBanner.isPending}
            className="w-full sm:w-auto"
          >
            {updateBanner.isPending ? t("common.saving") : t("admin.updateBanner")}
          </Button>
        </CardContent>
      </Card>

      {/* Provider Banner Management */}
      <Card className="mb-8 border-dashed">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              {t("admin.providerBannerManagement")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("admin.providerBannerHint")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="provider-banner-active" className="text-sm">
              {providerBannerForm.isActive
                ? t("admin.bannerActive")
                : t("admin.bannerInactive")}
            </Label>
            <Switch
              id="provider-banner-active"
              checked={providerBannerForm.isActive ?? false}
              onCheckedChange={(checked) =>
                setProviderBannerForm((prev) => ({ ...prev, isActive: checked }))
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {providerBannerForm.isActive && (
            <div
              className="mb-4 rounded-xl p-4"
              style={{
                backgroundColor: providerBannerForm.backgroundColor || "#7c3aed",
                color: providerBannerForm.textColor || "#ffffff",
              }}
            >
              <p className="font-bold">
                {i18n.language === "ar"
                  ? providerBannerForm.titleAr
                  : providerBannerForm.titleEn}
              </p>
              <p className="text-sm opacity-80">
                {i18n.language === "ar"
                  ? providerBannerForm.subtitleAr
                  : providerBannerForm.subtitleEn}
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider-banner-title-en">{t("admin.bannerTitleEn")}</Label>
              <Input
                id="provider-banner-title-en"
                value={providerBannerForm.titleEn || ""}
                onChange={(e) =>
                  setProviderBannerForm((prev) => ({ ...prev, titleEn: e.target.value }))
                }
                placeholder="New Feature!"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-banner-title-ar">{t("admin.bannerTitleAr")}</Label>
              <Input
                id="provider-banner-title-ar"
                value={providerBannerForm.titleAr || ""}
                onChange={(e) =>
                  setProviderBannerForm((prev) => ({ ...prev, titleAr: e.target.value }))
                }
                placeholder="ميزة جديدة!"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-banner-subtitle-en">
                {t("admin.bannerSubtitleEn")}
              </Label>
              <Input
                id="provider-banner-subtitle-en"
                value={providerBannerForm.subtitleEn || ""}
                onChange={(e) =>
                  setProviderBannerForm((prev) => ({
                    ...prev,
                    subtitleEn: e.target.value,
                  }))
                }
                placeholder="Check out our latest updates"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-banner-subtitle-ar">
                {t("admin.bannerSubtitleAr")}
              </Label>
              <Input
                id="provider-banner-subtitle-ar"
                value={providerBannerForm.subtitleAr || ""}
                onChange={(e) =>
                  setProviderBannerForm((prev) => ({
                    ...prev,
                    subtitleAr: e.target.value,
                  }))
                }
                placeholder="اطلعي على آخر التحديثات"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-banner-bg-color">{t("admin.bannerBgColor")}</Label>
              <div className="flex gap-2">
                <Input
                  id="provider-banner-bg-color"
                  type="color"
                  value={providerBannerForm.backgroundColor || "#7c3aed"}
                  onChange={(e) =>
                    setProviderBannerForm((prev) => ({
                      ...prev,
                      backgroundColor: e.target.value,
                    }))
                  }
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={providerBannerForm.backgroundColor || "#7c3aed"}
                  onChange={(e) =>
                    setProviderBannerForm((prev) => ({
                      ...prev,
                      backgroundColor: e.target.value,
                    }))
                  }
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-banner-text-color">
                {t("admin.bannerTextColor")}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="provider-banner-text-color"
                  type="color"
                  value={providerBannerForm.textColor || "#ffffff"}
                  onChange={(e) =>
                    setProviderBannerForm((prev) => ({
                      ...prev,
                      textColor: e.target.value,
                    }))
                  }
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={providerBannerForm.textColor || "#ffffff"}
                  onChange={(e) =>
                    setProviderBannerForm((prev) => ({
                      ...prev,
                      textColor: e.target.value,
                    }))
                  }
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="provider-banner-link">{t("admin.bannerLink")}</Label>
              <Input
                id="provider-banner-link"
                value={providerBannerForm.linkUrl || ""}
                onChange={(e) =>
                  setProviderBannerForm((prev) => ({ ...prev, linkUrl: e.target.value }))
                }
                placeholder="/provider/services"
              />
            </div>
          </div>
          <Button
            onClick={handleProviderBannerUpdate}
            disabled={updateProviderBanner.isPending}
            className="w-full sm:w-auto"
          >
            {updateProviderBanner.isPending
              ? t("common.saving")
              : t("admin.updateBanner")}
          </Button>
        </CardContent>
      </Card>

      {/* Subscription Settings */}
      <Card className="mb-8 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t("admin.subscriptionSettings")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="monthly-price">
                {t("admin.monthlyPrice")} ({t("common.currency")})
              </Label>
              <Input
                id="monthly-price"
                type="number"
                min="0"
                step="1"
                value={subscriptionForm.monthlyPrice}
                onChange={(e) =>
                  setSubscriptionForm((prev) => ({
                    ...prev,
                    monthlyPrice: parseFloat(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("admin.monthlyPriceHint")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trial-days">{t("admin.trialDays")}</Label>
              <Input
                id="trial-days"
                type="number"
                min="0"
                step="1"
                value={subscriptionForm.trialDays}
                onChange={(e) =>
                  setSubscriptionForm((prev) => ({
                    ...prev,
                    trialDays: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("admin.trialDaysHint")}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                {t("admin.subscriptionPlans")}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("admin.subscriptionPlansHint")}
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              {subscriptionForm.plans.map((plan, index) => (
                <Card key={plan.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {plan.months === 1
                          ? t("subscription.monthlyPlan")
                          : plan.months === 6
                            ? t("subscription.halfYearlyPlan")
                            : plan.months === 12
                              ? t("subscription.yearlyPlan")
                              : `${plan.months} ${t("subscription.months")}`}
                      </span>
                      <Switch
                        checked={plan.isActive}
                        onCheckedChange={(checked) => {
                          const newPlans = [...subscriptionForm.plans];
                          newPlans[index] = { ...plan, isActive: checked };
                          setSubscriptionForm((prev) => ({ ...prev, plans: newPlans }));
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {plan.months} {t("subscription.months")}
                    </p>

                    <div className="space-y-2">
                      <Label className="text-xs">{t("admin.planPrice")} (SAR)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={plan.price}
                        onChange={(e) => {
                          const newPlans = [...subscriptionForm.plans];
                          newPlans[index] = {
                            ...plan,
                            price: parseFloat(e.target.value) || 0,
                          };
                          setSubscriptionForm((prev) => ({ ...prev, plans: newPlans }));
                        }}
                        disabled={!plan.isActive}
                        className="h-8"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">{t("admin.discountPercent")} (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={plan.discountPercent}
                        onChange={(e) => {
                          const newPlans = [...subscriptionForm.plans];
                          newPlans[index] = {
                            ...plan,
                            discountPercent: parseFloat(e.target.value) || 0,
                          };
                          setSubscriptionForm((prev) => ({ ...prev, plans: newPlans }));
                        }}
                        disabled={!plan.isActive}
                        className="h-8"
                      />
                    </div>

                    {plan.months > 1 && (
                      <p className="text-xs text-muted-foreground">
                        {t("admin.effectiveMonthlyRate")}:{" "}
                        {(plan.price / plan.months).toFixed(2)} SAR
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubscriptionUpdate}
            disabled={updateSubscriptionSettings.isPending}
            className="w-full sm:w-auto"
          >
            {updateSubscriptionSettings.isPending
              ? t("common.saving")
              : t("admin.saveSubscription")}
          </Button>
        </CardContent>
      </Card>

      {/* Contact Info Settings */}
      <Card className="mb-8 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {t("admin.contactSettings")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-email">{t("admin.contactEmail")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="support@example.com"
                  value={contactForm.contactEmail}
                  onChange={(e) =>
                    setContactForm((prev) => ({
                      ...prev,
                      contactEmail: e.target.value,
                    }))
                  }
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("admin.contactEmailHint")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">{t("admin.contactPhone")}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="contact-phone"
                  type="tel"
                  placeholder="+966 55 123 4567"
                  value={contactForm.contactPhone}
                  onChange={(e) =>
                    setContactForm((prev) => ({
                      ...prev,
                      contactPhone: e.target.value,
                    }))
                  }
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("admin.contactPhoneHint")}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-whatsapp">{t("admin.contactWhatsapp")}</Label>
            <Input
              id="contact-whatsapp"
              type="url"
              placeholder="https://wa.me/966551234567"
              value={contactForm.contactWhatsapp}
              onChange={(e) =>
                setContactForm((prev) => ({
                  ...prev,
                  contactWhatsapp: e.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              {t("admin.contactWhatsappHint")}
            </p>
          </div>
          <Button
            onClick={handleContactUpdate}
            disabled={updateSubscriptionSettings.isPending}
            className="w-full sm:w-auto"
          >
            {updateSubscriptionSettings.isPending
              ? t("common.saving")
              : t("admin.saveContact")}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminSettingsPage;
