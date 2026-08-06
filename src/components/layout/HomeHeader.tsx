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
      <div className="container flex items-center justify-between gap-2 py-3">
        {/* User identity */}
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={user?.photoURL} alt={user?.name} />
            <AvatarFallback className="font-semibold text-primary">
              {(user?.name || "?").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold leading-tight text-foreground">
              {user?.name || t("profile.guest")}
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {t(`roles.${roleLabel}`)}
            </p>
          </div>
        </div>

        {/* Account switcher — sits centered between the identity block and
            the bell, sized compactly so it never wraps to its own row. */}
        {canSwitchRole && (
          <button
            type="button"
            onClick={handleSwitchRole}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/15"
          >
            <ArrowLeftRight className="h-3 w-3 shrink-0" />
            <span>
              {activeRole === "CLIENT"
                ? t("home.switchToProvider")
                : t("home.switchToClient")}
            </span>
            <User className="h-3 w-3 shrink-0" />
          </button>
        )}

        {!isGuest && <NotificationBell />}
      </div>
    </header>
  );
};

export default HomeHeader;
