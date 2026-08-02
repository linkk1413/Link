import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  MapPin,
  CheckCircle,
  Clock,
  MessageSquare,
  MessageCircle,
  Phone,
  Calendar,
  Navigation,
  Flag,
  Ban,
  MoreVertical,
  Edit,
  Reply,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProviderProfile, useProviderServices } from "@/hooks/queries";
import { useReviews, useClientProviderReview } from "@/hooks/queries/useReviews";
import { useCreateChat } from "@/hooks/queries/useChats";
import {
  useBlockUser,
  useUnblockUser,
  useIsUserBlocked,
} from "@/hooks/queries/useBlocks";
import {
  useIsFavorited,
  useAddFavorite,
  useRemoveFavorite,
} from "@/hooks/queries/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { useRequestTrackingConsent } from "@/components/TrackingConsent";
import {
  useGeolocation,
  calculateDistanceKm,
  formatDistance,
} from "@/hooks/useGeolocation";
import { Service } from "@/types";
import { formatServiceDuration } from "@/lib/duration";
import { formatLocation } from "@/lib/saudiLocations";
import {
  DEFAULT_COMMUNICATION_PREFS,
  getWhatsappLink,
  getTelLink,
} from "@/lib/phone";
import { ReportDialog } from "@/components/ReportDialog";
import { ReviewDialog } from "@/components/ReviewDialog";
import { toast } from "sonner";

const ProviderProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isArabic = i18n.language === "ar";

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  // Geolocation for distance calculation
  const { location, requestLocation } = useGeolocation();
  const { consentStatus } = useRequestTrackingConsent();

  // Request location on mount only if already consented
  React.useEffect(() => {
    if (!location && consentStatus === "granted") {
      requestLocation();
    }
  }, [consentStatus]);

  // Fetch data
  const { data: provider, isLoading: loadingProvider } = useProviderProfile(
    id || "",
  );
  const { data: services = [], isLoading: loadingServices } =
    useProviderServices(id || "");
  const { data: reviews = [], isLoading: loadingReviews } = useReviews({
    providerId: id,
  });
  
  // Check if current user has already reviewed this provider
  const { data: existingReview } = useClientProviderReview(
    user?.uid || "",
    id || ""
  );

  // Calculate distance to provider (must be after provider is fetched)
  const distanceToProvider = React.useMemo(() => {
    if (!location || !provider?.latitude || !provider?.longitude) return null;
    return calculateDistanceKm(
      location.lat,
      location.lng,
      provider.latitude,
      provider.longitude,
    );
  }, [location, provider?.latitude, provider?.longitude]);

  const createChatMutation = useCreateChat();
  const blockUserMutation = useBlockUser();
  const unblockUserMutation = useUnblockUser();
  const { data: isBlocked } = useIsUserBlocked(user?.uid || "", id || "");
  const { data: isFavorited } = useIsFavorited(user?.uid || "", id || "");
  const addFavoriteMutation = useAddFavorite();
  const removeFavoriteMutation = useRemoveFavorite();

  const handleBack = () => {
    navigate(-1);
  };

  const handleBookService = (service: Service) => {
    navigate(`/client/book/${service.id}`);
  };

  const handleMessage = async () => {
    if (!user || !id) return;

    try {
      const chatId = await createChatMutation.mutateAsync({
        clientId: user.uid,
        providerId: id,
        clientName: user.displayName || user.email?.split("@")[0] || "",
        providerName: provider?.displayName || "",
      });
      navigate(`/client/chats/${chatId}`);
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user || !id) return;
    try {
      if (isFavorited) {
        await removeFavoriteMutation.mutateAsync({ clientId: user.uid, providerId: id });
        toast.success(t("favorites.removed"));
      } else {
        await addFavoriteMutation.mutateAsync({
          clientId: user.uid,
          providerId: id,
          providerName: provider?.displayName,
        });
        toast.success(t("favorites.added"));
      }
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const communicationPrefs =
    provider?.communicationPrefs || DEFAULT_COMMUNICATION_PREFS;
  const showChatButton = communicationPrefs.inAppChat;
  const showWhatsappButton = communicationPrefs.whatsapp && !!provider?.phone;
  const showCallButton = communicationPrefs.phoneCall && !!provider?.phone;
  const hasAnyContactMethod =
    showChatButton || showWhatsappButton || showCallButton;

  const handleBlock = async () => {
    if (!user || !id) return;
    try {
      if (isBlocked) {
        await unblockUserMutation.mutateAsync({
          blockerId: user.uid,
          blockedUserId: id,
        });
        toast.success(t("block.unblocked"));
      } else {
        await blockUserMutation.mutateAsync({
          blockerId: user.uid,
          blockedUserId: id,
        });
        toast.success(t("block.blocked"));
      }
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  if (loadingProvider) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="mb-4 h-10 w-24" />
        <Skeleton className="mb-6 h-40 w-full rounded-2xl" />
        <Skeleton className="mb-4 h-20 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">{t("provider.notFound")}</p>
        <Button variant="outline" onClick={handleBack} className="mt-4">
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container flex items-center gap-4 py-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <h1 className="text-lg font-semibold flex-1">
            {t("provider.profile")}
          </h1>
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFavorite}
              aria-label={t(isFavorited ? "favorites.remove" : "favorites.add")}
            >
              <Heart
                className={`h-5 w-5 ${isFavorited ? "fill-destructive text-destructive" : ""}`}
              />
            </Button>
          )}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setReportDialogOpen(true)}
                  className="text-destructive"
                >
                  <Flag className="h-4 w-4 me-2" />
                  {t("report.reportProvider")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBlock}>
                  <Ban className="h-4 w-4 me-2" />
                  {isBlocked ? t("block.unblock") : t("block.block")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <main className="container py-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Provider Info Card */}
          <div className="mb-6 rounded-2xl bg-card p-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-3xl">
                👩‍💼
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">
                    {provider.displayName || t("provider.provider")}
                  </h2>
                  {provider.isVerified && (
                    <CheckCircle
                      className="h-5 w-5 text-blue-500"
                      aria-label={t("provider.verified")}
                    />
                  )}
                </div>

                {/* Rating */}
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span className="font-medium">
                      {provider.ratingAvg.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ({provider.ratingCount} {t("provider.reviews")})
                  </span>
                </div>

                {/* Location */}
                {(provider.city || provider.area) && (
                  <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {formatLocation(provider, isArabic) ||
                        t("common.noResults")}
                    </span>
                  </div>
                )}

                {/* Distance */}
                {distanceToProvider !== null && (
                  <div className="mt-2 flex items-center gap-1 text-sm font-medium text-primary">
                    <Navigation className="h-4 w-4" />
                    <span>
                      {formatDistance(distanceToProvider)}{" "}
                      {t("profile.awayFromYou")}
                    </span>
                  </div>
                )}

                {provider.isVerified && (
                  <Badge variant="secondary" className="mt-2">
                    {t("provider.verified")}
                  </Badge>
                )}
              </div>
            </div>

            {/* Bio */}
            {provider.bio && (
              <p className="mt-4 text-muted-foreground">{provider.bio}</p>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="services" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="services" className="flex-1">
                {t("provider.services")}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex-1">
                {t("provider.reviews")} ({reviews.length})
              </TabsTrigger>
              <TabsTrigger value="about" className="flex-1">
                {t("provider.about")}
              </TabsTrigger>
            </TabsList>

            {/* Services Tab */}
            <TabsContent value="services" className="mt-4">
              {loadingServices ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                  ))}
                </div>
              ) : services.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {t("provider.noServices")}
                </div>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className={`w-full rounded-2xl bg-card p-4 text-start transition-all ${
                        selectedService?.id === service.id
                          ? "ring-2 ring-primary"
                          : "hover:bg-accent"
                      }`}
                    >
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {service.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {service.description}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatServiceDuration(
                                service,
                                t("services.hourUnit"),
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="text-end">
                          <p className="font-semibold text-primary">
                            {service.price} SAR
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="mt-4">
              {/* Leave Review Button - Show for logged in clients */}
              {user && user.uid !== id && (
                <div className="mb-4">
                  <Button
                    onClick={() => setReviewDialogOpen(true)}
                    className="w-full gap-2"
                    variant={existingReview ? "outline" : "default"}
                  >
                    {existingReview ? (
                      <>
                        <Edit className="h-4 w-4" />
                        {t("review.editReview")}
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4" />
                        {t("review.leaveReview")}
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {loadingReviews ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {t("provider.noReviews")}
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-2xl bg-card p-4">
                      {/* Client name and service */}
                      <div className="flex items-center justify-between mb-2">
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
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString(
                            isArabic ? "ar-SA" : "en-US",
                          )}
                        </span>
                      </div>
                      {/* Stars */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-muted"
                            }`}
                          />
                        ))}
                      </div>
                      {review.comment && (
                        <p className="mt-2 text-sm text-foreground">
                          "{review.comment}"
                        </p>
                      )}
                      {/* Provider Reply */}
                      {review.providerReply && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg border-s-2 border-primary">
                          <div className="flex items-center gap-2 mb-1">
                            <Reply className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-medium text-primary">
                              {t("providerReviews.providerReply")}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">
                            {review.providerReply}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* About Tab */}
            <TabsContent value="about" className="mt-4">
              <div className="rounded-2xl bg-card p-4">
                <h3 className="mb-2 font-semibold">{t("provider.about")}</h3>
                <p className="text-muted-foreground">
                  {provider.bio || t("provider.noBio")}
                </p>

                <div className="mt-4 space-y-2 text-sm">
                  {(provider.city || provider.area) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{formatLocation(provider, isArabic)}</span>
                    </div>
                  )}
                  {provider.radiusKm && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {t("provider.serviceRadius")}: {provider.radiusKm} km
                      </span>
                    </div>
                  )}
                </div>

                {/* Reporting must be findable, not buried in the ⋮ menu */}
                {user && (
                  <Button
                    variant="outline"
                    className="mt-6 w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => setReportDialogOpen(true)}
                  >
                    <Flag className="h-4 w-4" />
                    {t("report.reportProvider")}
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-20 left-0 right-0 border-t border-border bg-card p-4">
        <div className="container flex flex-col gap-2">
          {hasAnyContactMethod && (
            <div className="flex gap-2">
              {showChatButton && (
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5 px-2"
                  onClick={handleMessage}
                  disabled={createChatMutation.isPending}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {createChatMutation.isPending
                      ? t("common.loading")
                      : t("provider.messageProvider")}
                  </span>
                </Button>
              )}
              {showWhatsappButton && (
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5 border-green-600/40 px-2 text-green-600 hover:bg-green-600/10 hover:text-green-600"
                  asChild
                >
                  <a
                    href={getWhatsappLink(provider.phone as string)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {t("provider.whatsappProvider")}
                    </span>
                  </a>
                </Button>
              )}
              {showCallButton && (
                <Button variant="outline" className="flex-1 gap-1.5 px-2" asChild>
                  <a href={getTelLink(provider.phone as string)}>
                    <Phone className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {t("provider.callProvider")}
                    </span>
                  </a>
                </Button>
              )}
            </div>
          )}
          <Button
            className="w-full gap-2"
            disabled={!selectedService}
            onClick={() =>
              selectedService && handleBookService(selectedService)
            }
          >
            <Calendar className="h-5 w-5" />
            {t("provider.bookNow")}
          </Button>
        </div>
      </div>

      {/* Report Dialog */}
      {user && id && (
        <ReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          targetType="PROVIDER"
          targetId={id}
          reporterId={user.uid}
          reporterName={user.name || user.displayName}
          reporterEmail={user.email}
          targetOwnerId={id}
          targetOwnerName={provider?.displayName}
        />
      )}

      {/* Review Dialog */}
      {user && id && (
        <ReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          clientId={user.uid}
          clientName={user.name || user.displayName}
          providerId={id}
          existingReview={existingReview}
        />
      )}
    </div>
  );
};

export default ProviderProfilePage;
