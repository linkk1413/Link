import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Upload, X } from "lucide-react";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { storage } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateReport } from "@/hooks/queries/useReports";
import { ReportReason, ReportTargetType } from "@/types";
import { toast } from "sonner";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  reporterId: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  /** Owner of the reported content (e.g. the provider for a review, the user for a message) */
  targetOwnerId?: string;
  targetOwnerName?: string;
  targetOwnerEmail?: string;
  targetOwnerPhone?: string;
  /** Snapshot of the content being reported */
  targetContent?: string;
  /** Extra context so admins can jump straight to the source */
  chatId?: string;
  serviceId?: string;
  bookingId?: string;
}

const REPORT_REASONS: ReportReason[] = [
  "abusive_language",
  "spam",
  "fraud_attempt",
  "impersonation",
  "inappropriate_content",
  "terms_violation",
  "harassment",
  "threat_blackmail",
  "suspicious_account",
  "other",
];

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export const ReportDialog: React.FC<ReportDialogProps> = ({
  open,
  onOpenChange,
  targetType,
  targetId,
  reporterId,
  reporterName,
  reporterEmail,
  reporterPhone,
  targetOwnerId,
  targetOwnerName,
  targetOwnerEmail,
  targetOwnerPhone,
  targetContent,
  chatId,
  serviceId,
  bookingId,
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const createReport = useCreateReport();

  const isOther = reason === "other";
  const descriptionMissing = isOther && !description.trim();

  const resetForm = () => {
    setReason("");
    setDescription("");
    setImages([]);
  };

  const handleAddImages = (files: FileList | null) => {
    if (!files) return;
    const next: File[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(t("report.invalidImageType"));
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(t("report.imageTooLarge"));
        continue;
      }
      next.push(file);
    }
    setImages((prev) => [...prev, ...next].slice(0, MAX_IMAGES));
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast.error(t("report.reasonRequired"));
      return;
    }
    if (descriptionMissing) {
      toast.error(t("report.otherReasonRequiresDetails"));
      return;
    }

    try {
      setIsUploading(true);
      const uploadedImages = await Promise.all(
        images.map(async (file) => {
          const path = `reports/${reporterId}/${Date.now()}-${file.name}`;
          const fileRef = storageRef(storage, path);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          return { url, name: file.name };
        }),
      );
      setIsUploading(false);

      await createReport.mutateAsync({
        reporterId,
        reporterName,
        reporterEmail,
        reporterPhone,
        targetType,
        targetId,
        reason,
        description: description.trim() || undefined,
        targetOwnerId,
        targetOwnerName,
        targetOwnerEmail,
        targetOwnerPhone,
        targetContent,
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
        chatId,
        serviceId,
        bookingId,
      });
      toast.success(t("report.success"));
      onOpenChange(false);
      resetForm();
    } catch (error) {
      setIsUploading(false);
      const message = error instanceof Error ? error.message : String(error);
      console.error("Report submission error:", {
        error,
        reporterId,
        targetType,
        targetId,
        reason,
      });
      toast.error(`${t("report.submitFailed")}: ${message}`);
    }
  };

  const isPending = createReport.isPending || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("report.title")}</DialogTitle>
          <DialogDescription>{t("report.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason Select */}
          <div className="space-y-2">
            <Label>{t("report.reason")}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder={t("report.selectReason")} />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`report.reasons.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Details */}
          <div className="space-y-2">
            <Label>
              {t("report.details")}{" "}
              {isOther ? (
                <span className="font-normal text-destructive">
                  ({t("common.required")})
                </span>
              ) : (
                <span className="font-normal text-muted-foreground">
                  ({t("common.optional")})
                </span>
              )}
            </Label>
            <Textarea
              placeholder={t("report.detailsPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
            {descriptionMissing && (
              <p className="text-xs text-destructive">
                {t("report.otherReasonRequiresDetails")}
              </p>
            )}
          </div>

          {/* Attached images */}
          <div className="space-y-2">
            <Label>
              {t("report.attachImages")}{" "}
              <span className="font-normal text-muted-foreground">
                ({t("common.optional")})
              </span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {images.map((file, index) => (
                <div key={`${file.name}-${index}`} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -end-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-accent">
                  <Upload className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleAddImages(e.target.files)}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason || descriptionMissing || isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("report.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
