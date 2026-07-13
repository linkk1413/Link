import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Users,
  CheckCircle,
  CreditCard,
  LayoutDashboard,
  Gift,
  Flag,
  Star,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const adminNavItems = [
  {
    path: "/admin",
    labelKey: "admin.nav.dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    path: "/admin/users",
    labelKey: "admin.nav.users",
    icon: <Users className="h-5 w-5" />,
  },
  {
    path: "/admin/verifications",
    labelKey: "admin.nav.verifications",
    icon: <CheckCircle className="h-5 w-5" />,
  },
  {
    path: "/admin/payouts",
    labelKey: "admin.nav.payouts",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    path: "/admin/subscriptions",
    labelKey: "admin.nav.subscriptions",
    icon: <Gift className="h-5 w-5" />,
  },
  {
    path: "/admin/reports",
    labelKey: "admin.nav.reports",
    icon: <Flag className="h-5 w-5" />,
  },
  {
    path: "/admin/reviews",
    labelKey: "admin.nav.reviews",
    icon: <Star className="h-5 w-5" />,
  },
];

export const AdminLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const isRTL = i18n.language === "ar";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen" dir={isRTL ? "rtl" : "ltr"}>
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-card p-4 md:hidden">
        <h1 className="text-lg font-bold text-foreground">
          {t("common.appName")} {t("admin.title")}
        </h1>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Slide-out Menu */}
      <aside
        className={cn(
          "fixed top-0 z-50 h-screen w-64 transform border-e border-border bg-sidebar transition-transform duration-300 ease-in-out md:hidden",
          isRTL ? "right-0" : "left-0",
          mobileMenuOpen
            ? "translate-x-0"
            : isRTL
              ? "translate-x-full"
              : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-sidebar-border p-4">
            <h1 className="text-lg font-bold text-sidebar-foreground">
              {t("admin.title")}
            </h1>
            <Button variant="ghost" size="icon" onClick={closeMobileMenu}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {adminNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )
                }
              >
                {item.icon}
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-sidebar-border p-4">
            <button
              onClick={() => {
                closeMobileMenu();
                handleLogout();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50"
            >
              <LogOut className="h-5 w-5" />
              <span>{t("common.logout")}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed top-0 z-40 hidden h-screen w-64 border-e border-border bg-sidebar md:block",
          isRTL ? "right-0" : "left-0",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-sidebar-border p-4">
            <h1 className="text-xl font-bold text-sidebar-foreground">
              {t("common.appName")} {t("admin.title")}
            </h1>
            <LanguageSwitcher />
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {adminNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )
                }
              >
                {item.icon}
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-sidebar-border p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50"
            >
              <LogOut className="h-5 w-5" />
              <span>{t("common.logout")}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:ms-64">
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
