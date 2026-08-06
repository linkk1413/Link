import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  Star,
  MapPin,
  Briefcase,
  ArrowRight,
  Search,
  Clock,
  TrendingUp,
  Navigation,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { BannerSlider } from "@/components/BannerSlider";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useGuest } from "@/contexts/GuestContext";
import { useRequestTrackingConsent } from "@/components/TrackingConsent";
import { useCategories } from "@/hooks/queries/useCategories";
import { useServices } from "@/hooks/queries/useServices";
import { useVerifiedProviders } from "@/hooks/queries/useProviders";
import { useBanner } from "@/hooks/queries/useBanner";
import { formatServiceDuration } from "@/lib/duration";
import { formatLocation } from "@/lib/saudiLocations";
import {
  useGeolocation,
  calculateDistanceKm,
  formatDistance,
} from "@/hooks/useGeolocation";

const ClientHomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { isGuest } = useGuest();
  const navigate = useNavigate();
  const isArabic = i18n.language === "ar";

  const {
    location,
    loading: locationLoading,
    requestLocation,
  } = useGeolocation();
  const { requestTrackingConsent, consentStatus } = useRequestTrackingConsent();

  // Wrapper to show tracking consent before requesting location
  const handleRequestLocation = () => {
    if (consentStatus === "pending") {
      requestTrackingConsent(() => {
        requestLocation();
      });
    } else {
      requestLocation();
    }
  };

  const { data: categories = [], isLoading: loadingCategories } =
    useCategories();
  const { data: services = [], isLoading: loadingServices } = useServices({
    isActive: true,
  });
  const { data: providers = [], isLoading: loadingProviders } =
    useVerifiedProviders(6);
  const { data: banner } = useBanner();

  // Calculate distance for a provider
  const getProviderDistance = (provider: {
    latitude?: number;
    longitude?: number;
  }) => {
    if (!location || !provider.latitude || !provider.longitude) return null;
    return calculateDistanceKm(
      location.lat,
      location.lng,
      provider.latitude,
      provider.longitude,
    );
  };

  // Sort providers by distance if location is available
  const sortedProviders = useMemo(() => {
    if (!location) return providers;
    return [...providers].sort((a, b) => {
      const distA = getProviderDistance(a);
      const distB = getProviderDistance(b);
      if (distA === null && distB === null) return 0;
      if (distA === null) return 1;
      if (distB === null) return -1;
      return distA - distB;
    });
  }, [providers, location]);

  const categoriesWithServices = useMemo(() => {
    const map = new Map<string, { id: string; name: string; icon?: string }>();

    services.forEach((service) => {
      if (!service.categoryId) return;
      if (map.has(service.categoryId)) return;

      const matchedCategory = categories.find(
        (category) => category.id === service.categoryId,
      );
      const nameFromCategory = matchedCategory
        ? isArabic
          ? matchedCategory.nameAr
          : matchedCategory.nameEn
        : "";
      const fallbackName = service.categoryName || service.categoryId;

      map.set(service.categoryId, {
        id: service.categoryId,
        name: nameFromCategory || fallbackName,
        icon: matchedCategory?.icon,
      });
    });

    return Array.from(map.values());
  }, [services, categories, isArabic]);

  // Get popular services (top 4 by provider rating)
  const popularServices = useMemo(() => {
    const servicesWithProviders = services.map((service) => {
      const provider = providers.find((p) => p.uid === service.providerId);
      return { ...service, provider };
    });

    return servicesWithProviders
      .filter((s) => s.provider)
      .sort(
        (a, b) => (b.provider?.ratingAvg || 0) - (a.provider?.ratingAvg || 0),
      )
      .slice(0, 4);
  }, [services, providers]);

  // Get category info for a service
  const getCategoryInfo = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat
      ? { name: isArabic ? cat.nameAr : cat.nameEn, icon: cat.icon }
      : null;
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background">
      <HomeHeader roleLabel="client" />

      <main className="container py-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {/* Become a Provider CTA - Only show if user is not already a provider and not a guest */}
          {!isGuest && !user?.roles?.includes("PROVIDER") && (
            <motion.section variants={fadeInUp} className="mb-6">
              <button
                onClick={() => navigate("/client/become-provider")}
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-4 text-start text-primary-foreground transition-all hover:opacity-90"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold">
                        {t("becomeProvider.ctaTitle", "Become a Provider")}
                      </h3>
                      <p className="text-sm opacity-90">
                        {t(
                          "becomeProvider.ctaSubtitle",
                          "Start earning by offering your services",
                        )}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 rtl:rotate-180" />
                </div>
              </button>
            </motion.section>
          )}

          {/* Promotional Banner */}
          <motion.div variants={fadeInUp}>
            <BannerSlider slides={banner?.slides} isActive={banner?.isActive} />
          </motion.div>

          {/* Location Prompt - Show if no location set */}
          {!location && (
            <motion.section variants={fadeInUp} className="mb-6">
              <div className="flex items-center justify-between rounded-2xl bg-primary/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <Navigation className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {t("location.enableLocation")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("location.enableDescription")}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleRequestLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("location.enable")
                  )}
                </Button>
              </div>
            </motion.section>
          )}

          {/* Location Active Indicator */}
          {location && (
            <motion.section variants={fadeInUp} className="mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{t("location.showingNearest")}</span>
              </div>
            </motion.section>
          )}

          {/* Categories */}
          <motion.section variants={fadeInUp} className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {t("home.categories")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => navigate("/client/search?openFilter=true")}
              >
                {t("common.seeAll")}
              </Button>
            </div>
            {loadingCategories || loadingServices ? (
              <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center text-muted-foreground">
                {t("home.noCategories")}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
                {categories.slice(0, 8).map((category) => (
                  <button
                    key={category.id}
                    onClick={() =>
                      navigate(`/client/search?category=${category.id}`)
                    }
                    className="flex flex-col items-center rounded-2xl bg-card p-2 transition-all hover:bg-accent card-glow"
                  >
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={isArabic ? category.nameAr : category.nameEn}
                        className="mb-2 h-20 w-20 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CategoryIcon icon={category.icon} size={36} />
                      </div>
                    )}
                    <span className="text-xs font-medium text-card-foreground text-center line-clamp-1">
                      {isArabic ? category.nameAr : category.nameEn}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.section>

          {/* Popular Services */}
          {popularServices.length > 0 && (
            <motion.section variants={fadeInUp} className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  <TrendingUp className="me-2 inline h-5 w-5 text-primary" />
                  {t("home.popularServices")}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() => navigate("/client/search")}
                >
                  {t("common.seeAll")}
                </Button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {popularServices.map((service) => {
                  const catInfo = getCategoryInfo(service.categoryId);
                  return (
                    <button
                      key={service.id}
                      onClick={() =>
                        navigate(`/client/provider/${service.providerId}`)
                      }
                      className="min-w-[200px] max-w-[200px] shrink-0 rounded-2xl bg-card p-3 text-start transition-all hover:bg-accent card-glow"
                    >
                      {service.mediaUrls?.[0] ? (
                        <img
                          src={service.mediaUrls[0]}
                          alt={service.title}
                          className="mb-2 h-24 w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="mb-2 flex h-24 w-full items-center justify-center rounded-xl bg-muted">
                          <span className="text-3xl">
                            {catInfo?.icon || "🎯"}
                          </span>
                        </div>
                      )}
                      <h3 className="font-medium text-foreground line-clamp-1">
                        {service.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatServiceDuration(service, t("services.hourUnit"))}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary">
                          {service.price} {t("common.currency")}
                        </span>
                        {service.provider && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{service.provider.ratingAvg.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* Featured Providers */}
          <motion.section variants={fadeInUp} className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                <Sparkles className="me-2 inline h-5 w-5 text-primary" />
                {t("home.featuredProviders")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => navigate("/client/search")}
              >
                {t("common.seeAll")}
              </Button>
            </div>

            {loadingProviders ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : providers.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">{t("common.noResults")}</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {sortedProviders.map((provider) => {
                  const distance = getProviderDistance(provider);
                  return (
                    <button
                      key={provider.uid}
                      onClick={() =>
                        navigate(`/client/provider/${provider.uid}`)
                      }
                      className="flex items-start gap-4 rounded-2xl bg-card p-4 text-start transition-all hover:bg-accent card-glow"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl">
                        👩‍💼
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">
                            {provider.displayName || t("provider.provider")}
                          </h3>
                          {provider.isVerified && (
                            <Badge variant="secondary" className="shrink-0">
                              ✓ {t("provider.verified")}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{provider.ratingAvg.toFixed(1)}</span>
                          <span>
                            ({provider.ratingCount} {t("provider.reviews")})
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">
                              {formatLocation(provider, isArabic)}
                            </span>
                          </div>
                          {distance !== null && (
                            <Badge variant="outline" className="shrink-0 gap-1">
                              <Navigation className="h-3 w-3" />
                              {formatDistance(distance)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.section>

        </motion.div>
      </main>
    </div>
  );
};

export default ClientHomePage;
