import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { useGuest } from "@/contexts/GuestContext";
import { UserRole } from "@/types";

interface HomeHeaderProps {
  roleLabel: "client" | "provider";
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ roleLabel }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, switchRole } = useAuth();
  const { isGuest } = useGuest();

  const activeRole: UserRole = roleLabel === "client" ? "CLIENT" : "PROVIDER";
  const canSwitchRole = !isGuest && !!user && user.roles.length > 1;

  const handleSwitchRole = async () => {
    if (!user) return;
    const nextRole: UserRole = activeRole === "CLIENT" ? "PROVIDER" : "CLIENT";
    try {
      await switchRole(nextRole);
      navigate(nextRole === "CLIENT" ? "/client" : "/provider");
    } catch (error) {
      console.error("Failed to switch role:", error);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container flex flex-col gap-2 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* User identity — gets the full row, comfortably fits at any
              width now that it only ever shares the row with the bell. */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarImage src={user?.photoURL} alt={user?.name} />
              <AvatarFallback className="font-semibold text-primary">
                {(user?.name || "?").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate font-semibold leading-tight text-foreground">
                {user?.name || t("profile.guest")}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {t(`roles.${roleLabel}`)}
              </p>
            </div>
          </div>

          {!isGuest && <NotificationBell />}
        </div>

        {/* Account switcher — its own row, aligned under the bell so it
            still reads as grouped with it, without competing with the
            identity block for width (the full pill text made that
            impossible on narrow screens). */}
        {canSwitchRole && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSwitchRole}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">
                {activeRole === "CLIENT"
                  ? t("home.switchToProvider")
                  : t("home.switchToClient")}
              </span>
              <User className="h-3.5 w-3.5 shrink-0" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default HomeHeader;
