import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  MapPin,
  Star,
  Clock,
  ChevronRight,
  Navigation,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CategoryCard } from "@/components/CategoryCard";
import { useCategories } from "@/hooks/queries/useCategories";
import { useServices } from "@/hooks/queries/useServices";
import { useProvidersByIds } from "@/hooks/queries/useProviders";
import { useAuth } from "@/contexts/AuthContext";
import { useGuest } from "@/contexts/GuestContext";
import { useRequestTrackingConsent } from "@/components/TrackingConsent";
import {
  useGeolocation,
  calculateDistanceKm,
  formatDistance,
} from "@/hooks/useGeolocation";
import { Service, ProviderProfile } from "@/types";
import { formatServiceDuration } from "@/lib/duration";
import { getCityLabel, getDistrictLabel } from "@/lib/saudiLocations";

const ClientSearchPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isArabic = i18n.language === "ar";
  const { user } = useAuth();
  const { isGuest } = useGuest();
  const {
    location,
    requestLocation,
    hasPermission,
    loading: locationLoading,
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

  // Auto-request location on mount only if already consented and permission granted
  useEffect(() => {
    if (!location && hasPermission !== false && consentStatus === "granted") {
      requestLocation();
    }
  }, [hasPermission, consentStatus]);

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [maxDistance, setMaxDistance] = useState<number | null>(null); // null = no limit
  const [minRating, setMinRating] = useState<number | null>(null); // null = no minimum
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"nearest" | "rating">("nearest");

  // Read category from URL params on mount
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      // Support both single and multiple categories in URL
      const cats = categoryParam.split(",");
      setSelectedCategories(cats);
    }
  }, [searchParams]);

  // Update URL when categories change
  const updateCategoriesUrl = (cats: string[]) => {
    if (cats.length > 0) {
      setSearchParams({ category: cats.join(",") });
    } else {
      setSearchParams({});
    }
  };

  // Toggle a single category
  const toggleCategory = (categoryId: string) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((c) => c !== categoryId)
      : [...selectedCategories, categoryId];
    setSelectedCategories(newCategories);
    updateCategoriesUrl(newCategories);
  };

  // Clear all categories
  const clearCategories = () => {
    setSelectedCategories([]);
    setSearchParams({});
  };

  // Fetch data
  const { data: categories = [], isLoading: loadingCategories } =
    useCategories();
  const { data: services = [], isLoading: loadingServices } = useServices({
    isActive: true,
  });

  // Get unique provider IDs from services
  const providerIds = useMemo(() => {
    const ids = new Set<string>();
    services.forEach((s) => {
      if (s.providerId) ids.add(s.providerId);
    });
    return Array.from(ids);
  }, [services]);

  // Fetch providers by IDs from services
  const { data: providers = [], isLoading: loadingProviders } =
    useProvidersByIds(providerIds);

  // Create provider lookup map
  const providerMap = useMemo(() => {
    const map: Record<string, ProviderProfile> = {};
    providers.forEach((p) => (map[p.uid] = p));
    return map;
  }, [providers]);

  // Helper to get distance for a provider
  const getProviderDistance = (provider: ProviderProfile | undefined) => {
    if (!location) {
      // User's location not available
      return null;
    }
    if (!provider?.latitude || !provider?.longitude) {
      // Provider hasn't set their location
      return null;
    }
    return calculateDistanceKm(
      location.lat,
      location.lng,
      provider.latitude,
      provider.longitude,
    );
  };

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

  const categoryLookup = useMemo(() => {
    const map: Record<string, { name: string; icon?: string }> = {};
    categoriesWithServices.forEach((category) => {
      map[category.id] = { name: category.name, icon: category.icon };
    });
    return map;
  }, [categoriesWithServices]);

  // Filter services based on search, category, price, and distance
  const filteredServices = useMemo(() => {
    const filtered = services.filter((service) => {
      const matchesSearch =
        !searchQuery ||
        service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(service.categoryId);

      const matchesPrice =
        service.price >= priceRange[0] && service.price <= priceRange[1];

      // Distance filter
      let matchesDistance = true;
      if (maxDistance !== null && location) {
        const provider = providerMap[service.providerId];
        if (provider?.latitude && provider?.longitude) {
          const distance = calculateDistanceKm(
            location.lat,
            location.lng,
            provider.latitude,
            provider.longitude,
          );
          matchesDistance = distance <= maxDistance;
        } else {
          // If provider has no location, exclude when distance filter is active
          matchesDistance = false;
        }
      }

      // Rating filter
      let matchesRating = true;
      if (minRating !== null) {
        const provider = providerMap[service.providerId];
        const providerRating = provider?.ratingAvg || 0;
        matchesRating = providerRating >= minRating;
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesPrice &&
        matchesDistance &&
        matchesRating
      );
    });

    if (sortBy === "rating") {
      return [...filtered].sort((a, b) => {
        const ratingA = providerMap[a.providerId]?.ratingAvg || 0;
        const ratingB = providerMap[b.providerId]?.ratingAvg || 0;
        return ratingB - ratingA;
      });
    }

    const userRegion = user?.region || "";
    const userCity = user?.city || "";

    return [...filtered].sort((a, b) => {
      const providerA = providerMap[a.providerId];
      const providerB = providerMap[b.providerId];

      if (
        location &&
        providerA?.latitude &&
        providerA?.longitude &&
        providerB?.latitude &&
        providerB?.longitude
      ) {
        const distanceA = calculateDistanceKm(
          location.lat,
          location.lng,
          providerA.latitude,
          providerA.longitude,
        );
        const distanceB = calculateDistanceKm(
          location.lat,
          location.lng,
          providerB.latitude,
          providerB.longitude,
        );
        if (distanceA !== distanceB) return distanceA - distanceB;
      }

      const scoreA = providerA
        ? providerA.city === userCity
          ? 0
          : providerA.region === userRegion
            ? 1
            : 2
        : 3;
      const scoreB = providerB
        ? providerB.city === userCity
          ? 0
          : providerB.region === userRegion
            ? 1
            : 2
        : 3;

      if (scoreA !== scoreB) return scoreA - scoreB;

      const ratingA = providerA?.ratingAvg || 0;
      const ratingB = providerB?.ratingAvg || 0;
      return ratingB - ratingA;
    });
  }, [
    services,
    searchQuery,
    selectedCategories,
    priceRange,
    maxDistance,
    minRating,
    sortBy,
    providerMap,
    user,
    location,
  ]);

  const handleServiceClick = (service: Service) => {
    // Guests can only view, not navigate to provider/booking
    if (isGuest) {
      return;
    }
    navigate(`/client/provider/${service.providerId}`);
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container py-4">
          <h1 className="mb-4 text-xl font-semibold text-foreground">
            {t("nav.search")}
          </h1>

          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("search.placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 rounded-xl ps-12"
              />
            </div>
            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-xl"
                >
                  <Filter className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={isArabic ? "left" : "right"}>
                <SheetHeader>
                  <SheetTitle>{t("common.filter")}</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {/* Price Range Filter */}
                  <div>
                    <label className="mb-3 block text-sm font-medium">
                      {t("search.priceRange")}
                    </label>
                    <Slider
                      value={priceRange}
                      onValueChange={(value) =>
                        setPriceRange(value as [number, number])
                      }
                      min={0}
                      max={1000}
                      step={10}
                      className="mb-2"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{priceRange[0]} SAR</span>
                      <span>{priceRange[1]} SAR</span>
                    </div>
                  </div>

                  {/* Distance Filter */}
                  {location && (
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <label className="text-sm font-medium">
                          {t("search.maxDistance")}
                        </label>
                        {maxDistance !== null && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-muted-foreground"
                            onClick={() => setMaxDistance(null)}
                          >
                            {t("search.noLimit")}
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[5, 10, 25, 50].map((km) => (
                          <Button
                            key={km}
                            variant={maxDistance === km ? "default" : "outline"}
                            size="sm"
                            onClick={() =>
                              setMaxDistance(maxDistance === km ? null : km)
                            }
                            className="rounded-lg"
                          >
                            {km} {t("search.km")}
                          </Button>
                        ))}
                      </div>
                      {maxDistance !== null && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t("search.showingWithin", { distance: maxDistance })}
                        </p>
                      )}
                    </div>
                  )}

                  {!location && (
                    <button
                      onClick={handleRequestLocation}
                      disabled={locationLoading}
                      className="w-full rounded-lg bg-primary/10 p-3 text-start transition-colors hover:bg-primary/20"
                    >
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Navigation className="h-4 w-4" />
                        <span>
                          {locationLoading
                            ? t("search.gettingLocation")
                            : t("search.tapToEnableLocation")}
                        </span>
                      </div>
                    </button>
                  )}

                  {/* Minimum Rating Filter */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-sm font-medium">
                        {t("search.minRating")}
                      </label>
                      {minRating !== null && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs text-muted-foreground"
                          onClick={() => setMinRating(null)}
                        >
                          {t("search.anyRating")}
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[3, 3.5, 4, 4.5].map((rating) => (
                        <Button
                          key={rating}
                          variant={minRating === rating ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            setMinRating(minRating === rating ? null : rating)
                          }
                          className="rounded-lg gap-1"
                        >
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          {rating}+
                        </Button>
                      ))}
                    </div>
                    {minRating !== null && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("search.showingRatedAbove", { rating: minRating })}
                      </p>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => setFilterOpen(false)}
                  >
                    {t("search.applyFilters")}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="container py-4">
        {/* Location Request Banner */}
        {!location && hasPermission !== false && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <button
              onClick={handleRequestLocation}
              disabled={locationLoading}
              className="flex w-full items-center justify-between rounded-xl bg-primary/10 p-4 text-start transition-colors hover:bg-primary/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                  <Navigation className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {t("search.enableLocationTitle")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("search.enableLocationDescription")}
                  </p>
                </div>
              </div>
              {locationLoading && (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </button>
          </motion.div>
        )}

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        >
          {/* Categories */}
          {categories.length > 0 && (
            <motion.section variants={fadeInUp} className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("home.categories")}
                </h2>
                {selectedCategories.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground"
                    onClick={clearCategories}
                  >
                    {t("search.clearAll")}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
                {categories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    isArabic={isArabic}
                    selected={selectedCategories.includes(category.id)}
                    onClick={() => toggleCategory(category.id)}
                  />
                ))}
              </div>
            </motion.section>
          )}

          {/* Results */}
          <motion.section variants={fadeInUp}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium text-foreground">
                {t("search.results")} ({filteredServices.length})
              </h2>
              {/* Location status indicator */}
              {location ? (
                <Badge variant="secondary" className="gap-1 text-green-600">
                  <Navigation className="h-3 w-3" />
                  {t("search.locationEnabled")}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="cursor-pointer gap-1 text-muted-foreground hover:text-primary"
                  onClick={handleRequestLocation}
                >
                  <Navigation className="h-3 w-3" />
                  {t("search.enableLocation")}
                </Badge>
              )}
            </div>

            {loadingServices || loadingProviders ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-12 text-center">
                <Search className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">{t("common.noResults")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("search.tryDifferent")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredServices.map((service) => {
                  const provider = providerMap[service.providerId];
                  const distance = getProviderDistance(provider);

                  return (
                    <motion.button
                      key={service.id}
                      variants={fadeInUp}
                      onClick={() => handleServiceClick(service)}
                      className="w-full rounded-2xl bg-card p-4 text-start transition-all hover:bg-accent card-glow"
                    >
                      <div className="flex gap-4">
                        {/* Service Image */}
                        {service.mediaUrls?.[0] ? (
                          <img
                            src={service.mediaUrls[0]}
                            alt={service.title}
                            className="h-24 w-24 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-muted">
                            <CategoryIcon
                              icon={categoryLookup[service.categoryId]?.icon}
                              size={32}
                              className="text-muted-foreground"
                            />
                          </div>
                        )}

                        {/* Service Details */}
                        <div className="flex-1 overflow-hidden">
                          <h3 className="mb-1 truncate font-semibold text-foreground">
                            {service.title}
                          </h3>
                          <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
                            {service.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {/* Provider Rating */}
                            <Badge variant="secondary" className="gap-1">
                              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                              {provider && provider.ratingCount > 0
                                ? `${provider.ratingAvg.toFixed(1)} (${provider.ratingCount})`
                                : t("search.newProvider")}
                            </Badge>

                            {/* Duration */}
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {formatServiceDuration(
                                service,
                                t("services.hourUnit"),
                              )}
                            </Badge>

                            {/* Distance / Location */}
                            {distance !== null ? (
                              <Badge
                                variant="outline"
                                className="gap-1 text-primary"
                              >
                                <Navigation className="h-3 w-3" />
                                {formatDistance(distance)}
                              </Badge>
                            ) : provider?.area || provider?.city ? (
                              <Badge variant="outline" className="gap-1">
                                <MapPin className="h-3 w-3" />
                                {getDistrictLabel(provider.area || "", isArabic) ||
                                  getCityLabel(provider.city || "", isArabic)}
                              </Badge>
                            ) : null}
                          </div>

                          {/* Price */}
                          <div className="mt-2 flex items-center justify-between">
                            <span className="font-semibold text-primary">
                              {service.price} SAR
                            </span>
                            <ChevronRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" />
                          </div>
                        </div>
                      </div>
                    </motion.button>
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

export default ClientSearchPage;
