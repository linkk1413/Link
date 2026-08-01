import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/queries/useNotifications";
import { AppNotification } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export const NotificationBell: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: notifications, unreadCount } = useNotifications(user?.uid || "");
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (!user) return null;

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) {
      await markAllRead.mutateAsync(notifications);
    }
  };

  const handleClick = async (notification: AppNotification) => {
    if (!notification.read) {
      await markRead.mutateAsync(notification.id);
    }
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const formatDateTime = (date: Date) =>
    new Date(date).toLocaleString(isArabic ? "ar-SA" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full p-0 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="text-sm font-semibold">{t("notifications.title")}</span>
          {unreadCount > 0 && <CheckCheck className="h-4 w-4 text-muted-foreground" />}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {t("notifications.none")}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`flex w-full flex-col gap-0.5 p-3 text-start hover:bg-accent ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">{n.title}</span>
                  {n.body && (
                    <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                  )}
                  <span className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatDateTime(n.createdAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
