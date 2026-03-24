import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star, MessageSquare, User, Flag, Reply, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StarRating } from "@/components/StarRating";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useProviderReviews, useReplyToReview } from "@/hooks/queries/useReviews";
import { useProviderProfile } from "@/hooks/queries/useProviders";
import { ReportDialog } from "@/components/ReportDialog";
import { Review } from "@/types";
import { toast } from "sonner";

const ProviderReviewsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isArabic = i18n.language === "ar";

  const { data: reviews = [], isLoading } = useProviderReviews(user?.uid || "");
  const { data: profile } = useProviderProfile(user?.uid || "");
  const replyMutation = useReplyToReview();

  // Report dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reviewToReport, setReviewToReport] = useState<Review | null>(null);

  // Reply state
  const [replyingToReview, setReplyingToReview] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const handleReportReview = (review: Review) => {
    setReviewToReport(review);
    setReportDialogOpen(true);
  };

  const handleStartReply = (reviewId: string) => {
    setReplyingToReview(reviewId);
    setReplyText("");
  };

  const handleCancelReply = () => {
    setReplyingToReview(null);
    setReplyText("");
  };

  const handleSubmitReply = async (reviewId: string) => {
    if (!replyText.trim() || !user?.uid) return;

    try {
      await replyMutation.mutateAsync({
        reviewId,
        providerId: user.uid,
        reply: replyText.trim(),
      });
      toast.success(t("providerReviews.replySuccess"));
      setReplyingToReview(null);
      setReplyText("");
    } catch (error) {
      console.error("Failed to reply:", error);
      toast.error(t("providerReviews.replyError"));
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1:
        return t("review.rating1");
      case 2:
        return t("review.rating2");
      case 3:
        return t("review.rating3");
      case 4:
        return t("review.rating4");
      case 5:
        return t("review.rating5");
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container flex items-center gap-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground">
              {t("providerReviews.title")}
            </h1>
            {profile && (
              <p className="text-sm text-muted-foreground">
                {profile.ratingAvg.toFixed(1)} ★ · {profile.ratingCount}{" "}
                {t("provider.reviews")}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="container py-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          className="space-y-4"
        >
          {/* Summary Card */}
          {profile && profile.ratingCount > 0 && (
            <motion.div variants={fadeInUp}>
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="py-6">
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary">
                        {profile.ratingAvg.toFixed(1)}
                      </div>
                      <StarRating
                        rating={Math.round(profile.ratingAvg)}
                        size="sm"
                        readOnly
                        className="mt-1 justify-center"
                      />
                    </div>
                    <div className="h-16 w-px bg-border" />
                    <div className="text-center">
                      <div className="text-3xl font-bold text-foreground">
                        {profile.ratingCount}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("providerReviews.totalReviews")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Reviews List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <div className="flex gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <motion.div variants={fadeInUp}>
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-full bg-muted p-4">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">
                    {t("providerReviews.noReviews")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("providerReviews.noReviewsDescription")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            reviews.map((review) => (
              <motion.div key={review.id} variants={fadeInUp}>
                <Card>
                  <CardContent className="py-4">
                    <div className="flex gap-3">
                      {/* Client Avatar */}
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        {/* Client Name & Rating */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-foreground">
                              {review.clientName ||
                                t("providerReviews.anonymousClient")}
                            </p>
                            {review.serviceName && (
                              <p className="text-xs text-muted-foreground">
                                {review.serviceName}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className="shrink-0 gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {review.rating}
                          </Badge>
                        </div>

                        {/* Star Rating */}
                        <div className="mt-2 flex items-center gap-2">
                          <StarRating
                            rating={review.rating}
                            size="sm"
                            readOnly
                          />
                          <span className="text-xs text-muted-foreground">
                            {getRatingLabel(review.rating)}
                          </span>
                        </div>

                        {/* Comment */}
                        {review.comment && (
                          <p className="mt-3 text-sm text-foreground leading-relaxed">
                            "{review.comment}"
                          </p>
                        )}

                        {/* Provider Reply */}
                        {review.providerReply && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg border-s-2 border-primary">
                            <div className="flex items-center gap-2 mb-1">
                              <Reply className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-medium text-primary">
                                {t("providerReviews.yourReply")}
                              </span>
                            </div>
                            <p className="text-sm text-foreground">
                              {review.providerReply}
                            </p>
                            {review.providerReplyAt && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {new Date(review.providerReplyAt).toLocaleDateString(
                                  isArabic ? "ar-SA" : "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  },
                                )}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Reply Input */}
                        {replyingToReview === review.id && (
                          <div className="mt-3 space-y-2">
                            <Textarea
                              placeholder={t("providerReviews.replyPlaceholder")}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className="min-h-[80px]"
                              maxLength={500}
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelReply}
                              >
                                {t("common.cancel")}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSubmitReply(review.id)}
                                disabled={!replyText.trim() || replyMutation.isPending}
                              >
                                <Send className="h-4 w-4 me-1" />
                                {t("providerReviews.sendReply")}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Date */}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString(
                            isArabic ? "ar-SA" : "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                          {review.updatedAt && (
                            <span className="ms-1">({t("review.edited")})</span>
                          )}
                        </p>

                        {/* Action Buttons */}
                        <div className="mt-2 flex gap-2">
                          {/* Reply Button - only show if no reply yet and not currently replying */}
                          {!review.providerReply && replyingToReview !== review.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary gap-1 h-7 px-2"
                              onClick={() => handleStartReply(review.id)}
                            >
                              <Reply className="h-3.5 w-3.5" />
                              {t("providerReviews.reply")}
                            </Button>
                          )}
                          
                          {/* Report Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive gap-1 h-7 px-2"
                            onClick={() => handleReportReview(review)}
                          >
                            <Flag className="h-3.5 w-3.5" />
                            {t("report.flagReview")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Report Dialog */}
        {reviewToReport && (
          <ReportDialog
            open={reportDialogOpen}
            onOpenChange={setReportDialogOpen}
            targetType="REVIEW"
            targetId={reviewToReport.id}
            reporterId={user?.uid || ""}
            reporterName={user?.name || user?.displayName}
            targetOwnerId={reviewToReport.clientId}
            targetOwnerName={reviewToReport.clientName}
            targetContent={reviewToReport.comment}
          />
        )}
      </main>
    </div>
  );
};

export default ProviderReviewsPage;
