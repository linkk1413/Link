import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
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
import { ReportTargetType } from "@/types";
import { toast } from "sonner";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  reporterId: string;
  reporterName?: string;
  /** Owner of the reported content (e.g. the provider for a review, the user for a message) */
  targetOwnerId?: string;
  targetOwnerName?: string;
  /** Snapshot of the content being reported */
  targetContent?: string;
}

const REPORT_REASONS = [
  "inappropriate",
  "harassment",
  "spam",
  "hate",
  "violence",
  "sexual",
  "fraud",
  "other",
] as const;

export const ReportDialog: React.FC<ReportDialogProps> = ({
  open,
  onOpenChange,
  targetType,
  targetId,
  reporterId,
  reporterName,
  targetOwnerId,
  targetOwnerName,
  targetContent,
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const createReport = useCreateReport();

  const handleSubmit = async () => {
    if (!reason) {
      toast.error(t("report.reasonRequired"));
      return;
    }

    try {
      await createReport.mutateAsync({
        reporterId,
        reporterName,
        targetType,
        targetId,
        reason,
        description: description.trim() || undefined,
        targetOwnerId,
        targetOwnerName,
        targetContent,
      });
      toast.success(t("report.success"));
      onOpenChange(false);
      setReason("");
      setDescription("");
    } catch (error) {
      console.error("Report submission error:", error);
      toast.error(t("common.error"));
    }
  };

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
              <span className="text-muted-foreground font-normal">
                ({t("common.optional")})
              </span>
            </Label>
            <Textarea
              placeholder={t("report.detailsPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createReport.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason || createReport.isPending}
          >
            {createReport.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {t("report.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
