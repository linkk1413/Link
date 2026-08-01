import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites, useRemoveFavorite } from "@/hooks/queries/useFavorites";
import { toast } from "sonner";

const ClientFavoritesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: favorites = [], isLoading } = useFavorites(user?.uid || "");
  const removeFavoriteMutation = useRemoveFavorite();

  const handleRemove = async (providerId: string) => {
    if (!user) return;
    try {
      await removeFavoriteMutation.mutateAsync({ clientId: user.uid, providerId });
      toast.success(t("favorites.removed"));
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container flex items-center gap-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <h1 className="text-lg font-semibold">{t("favorites.title")}</h1>
        </div>
      </header>

      <main className="container py-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        >
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : favorites.length === 0 ? (
            <motion.div
              variants={fadeInUp}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center"
            >
              <Heart className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">{t("favorites.none")}</p>
            </motion.div>
          ) : (
            <motion.div variants={fadeInUp} className="space-y-3">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/client/provider/${fav.providerId}`)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-start"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {(fav.providerName || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {fav.providerName || t("provider.provider")}
                      </p>
                    </div>
                    <ChevronIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(fav.providerId)}
                    disabled={removeFavoriteMutation.isPending}
                    aria-label={t("favorites.remove")}
                  >
                    <Heart className="h-5 w-5 fill-destructive text-destructive" />
                  </Button>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default ClientFavoritesPage;
