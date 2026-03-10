import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/StarRating";
import { Review } from "@/types";
import {
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
} from "@/hooks/queries/useReviews";
import { toast } from "sonner";
import { isContentClean } from "@/lib/contentFilter";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  clientId: string;
  clientName?: string;
  providerId: string;
  serviceId?: string;
  serviceName?: string;
  existingReview?: Review | null;
  onSuccess?: () => void;
}

export const ReviewDialog: React.FC<ReviewDialogProps> = ({
  open,
  onOpenChange,
  bookingId,
  clientId,
  clientName,
  providerId,
  serviceId,
  serviceName,
  existingReview,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();

  const isEditing = !!existingReview;
  const isSubmitting =
    createReview.isPending || updateReview.isPending || deleteReview.isPending;

  // Reset form when dialog opens or existingReview changes
  useEffect(() => {
    if (open) {
      setRating(existingReview?.rating || 0);
      setComment(existingReview?.comment || "");
    }
  }, [open, existingReview]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error(t("review.ratingRequired"));
      return;
    }

    // Content filter check
    if (comment.trim() && !isContentClean(comment)) {
      toast.error(t("contentFilter.blocked"));
      return;
    }

    try {
      if (isEditing && existingReview) {
        await updateReview.mutateAsync({
          reviewId: existingReview.id,
          updates: { rating, comment: comment.trim() || undefined },
          providerId,
          bookingId,
        });
        toast.success(t("review.updateSuccess"));
      } else {
        await createReview.mutateAsync({
          bookingId,
          clientId,
          clientName,
          providerId,
          serviceId,
          serviceName,
          rating,
          comment: comment.trim() || undefined,
        });
        toast.success(t("review.submitSuccess"));
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Review submission error:", error);
      toast.error(t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!existingReview) return;

    try {
      await deleteReview.mutateAsync({
        reviewId: existingReview.id,
        providerId,
        bookingId,
      });
      toast.success(t("review.deleteSuccess"));
      setDeleteDialogOpen(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t("review.editReview") : t("review.leaveReview")}
            </DialogTitle>
            <DialogDescription>
              {serviceName && (
                <span className="font-medium text-foreground">
                  {serviceName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Star Rating */}
            <div className="space-y-2">
              <Label>{t("review.yourRating")}</Label>
              <div className="flex justify-center py-2">
                <StarRating
                  rating={rating}
                  size="lg"
                  onChange={setRating}
                  className="gap-2"
                />
              </div>
              {rating > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {rating === 1 && (t("review.rating1") || "Poor")}
                  {rating === 2 && (t("review.rating2") || "Fair")}
                  {rating === 3 && (t("review.rating3") || "Good")}
                  {rating === 4 && (t("review.rating4") || "Very Good")}
                  {rating === 5 && (t("review.rating5") || "Excellent")}
                </p>
              )}
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label htmlFor="comment">
                {t("review.comment")}{" "}
                <span className="text-muted-foreground font-normal">
                  ({t("common.optional") || "optional"})
                </span>
              </Label>
              <Textarea
                id="comment"
                placeholder={t("review.commentPlaceholder")}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {comment.length}/500
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("review.deleteReview")}
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={rating === 0 || isSubmitting}
                className="flex-1 sm:flex-none"
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isEditing
                  ? t("review.updateReview")
                  : t("review.submitReview")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("review.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("review.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteReview.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteReview.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteReview.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ReviewDialog;
