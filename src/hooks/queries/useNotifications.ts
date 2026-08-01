// Live in-app notifications — always written server-side, the client only
// ever reads/marks-read/clears its own (see firestore.rules + functions/index.js).
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  subscribeToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/firestore";
import { AppNotification } from "@/types";

export const useNotifications = (userId: string) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsubscribe = subscribeToNotifications(userId, (data) => {
      setNotifications(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { data: notifications, unreadCount, isLoading };
};

export const useMarkNotificationRead = () => {
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
  });
};

export const useMarkAllNotificationsRead = () => {
  return useMutation({
    mutationFn: (notifications: AppNotification[]) =>
      markAllNotificationsRead(notifications),
  });
};
