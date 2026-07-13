import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Star,
  Search,
  Trash2,
  Loader2,
  MessageSquare,
  Reply,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/StarRating";
import {
  useAllReviews,
  useDeleteReview,
  useDeleteReviewReply,
} from "@/hooks/queries/useReviews";
import { Review } from "@/types";
import { toast } from "sonner";

type Filter = "ALL" | "WITH_REPLY" | "LOW_RATED";
type PendingAction = { review: Review; type: "review" | "reply" };

const AdminReviewsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [pending, setPending] = useState<PendingAction | null>(null);

  const { data: reviews = [], isLoading } = useAllReviews();
  const deleteReview = useDeleteReview();
  const deleteReply = useDeleteReviewReply();

  const filteredReviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reviews.filter((review) => {
      const matchesFilter =
        filter === "ALL" ||
        (filter === "WITH_REPLY" && !!review.providerReply) ||
        (filter === "LOW_RATED" && review.rating <= 2);

      const matchesSearch =
        !q ||
        review.clientName?.toLowerCase().includes(q) ||
        review.serviceName?.toLowerCase().includes(q) ||
        review.comment?.toLowerCase().includes(q) ||
        review.providerReply?.toLowerCase().includes(q) ||
        review.providerId?.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [reviews, filter, searchQuery]);

  const confirmDelete = async () => {
    if (!pending) return;
    const { review, type } = pending;

    try {
      if (type === "review") {
        await deleteReview.mutateAsync({
          reviewId: review.id,
          providerId: review.providerId,
          bookingId: review.bookingId,
          clientId: review.clientId,
        });
        toast.success(t("adminReviews.reviewDeleted"));
      } else {
        await deleteReply.mutateAsync({
          reviewId: review.id,
          providerId: review.providerId,
        });
        toast.success(t("adminReviews.replyDeleted"));
      }
      setPending(null);
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error(t("common.error"));
    }
  };

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const isPendingMutation = deleteReview.isPending || deleteReply.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t("adminReviews.title")}
        </h1>
        <p className="text-muted-foreground">{t("adminReviews.subtitle")}</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("adminReviews.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-9"
        />
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="w-full">
          <TabsTrigger value="ALL" className="flex-1">
            {t("common.all")} ({reviews.length})
          </TabsTrigger>
          <TabsTrigger value="WITH_REPLY" className="flex-1">
            {t("adminReviews.withReply")}
          </TabsTrigger>
          <TabsTrigger value="LOW_RATED" className="flex-1">
            {t("adminReviews.lowRated")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t("adminReviews.noReviews")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Client + rating */}
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          {review.rating}
                        </Badge>
                        <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {review.clientName || t("adminReviews.anonymous")}
                        </span>
                        {review.serviceName && (
                          <Badge variant="outline">{review.serviceName}</Badge>
                        )}
                      </div>

                      <StarRating rating={review.rating} size="sm" readOnly />

                      {review.comment && (
                        <p className="mt-2 text-sm italic text-foreground">
                          "{review.comment}"
                        </p>
                      )}

                      {/* Provider reply */}
                      {review.providerReply && (
                        <div className="mt-3 rounded-lg border-s-2 border-primary bg-muted/50 p-3">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                              <Reply className="h-3.5 w-3.5" />
                              {t("adminReviews.providerReply")}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2 text-destructive hover:text-destructive"
                              onClick={() =>
                                setPending({ review, type: "reply" })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t("adminReviews.deleteReply")}
                            </Button>
                          </div>
                          <p className="text-sm text-foreground">
                            {review.providerReply}
                          </p>
                        </div>
                      )}

                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>

                    {/* Delete whole review */}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="shrink-0 gap-1"
                      onClick={() => setPending({ review, type: "review" })}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("adminReviews.deleteReview")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.type === "reply"
                ? t("adminReviews.deleteReplyTitle")
                : t("adminReviews.deleteReviewTitle")}
            </DialogTitle>
            <DialogDescription>
              {pending?.type === "reply"
                ? t("adminReviews.deleteReplyDescription")
                : t("adminReviews.deleteReviewDescription")}
            </DialogDescription>
          </DialogHeader>

          {pending && (
            <div className="rounded-lg bg-muted p-3 text-sm italic">
              "
              {pending.type === "reply"
                ? pending.review.providerReply
                : pending.review.comment || t("adminReviews.noComment")}
              "
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPending(null)}
              disabled={isPendingMutation}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPendingMutation}
            >
              {isPendingMutation ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="me-2 h-4 w-4" />
              )}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReviewsPage;
