import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  Save,
  X,
  CalendarOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useProviderBookings } from "@/hooks/queries/useBookings";
import {
  useProviderProfile,
  useUpdateProviderProfile,
} from "@/hooks/queries/useProviders";
import { toast } from "@/components/ui/sonner";
import { AvailabilityRule, AvailabilityException } from "@/types";

const DEFAULT_WEEKLY_SCHEDULE: Record<number, AvailabilityRule | null> = {
  0: null, // Sunday - off
  1: { id: "1", dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
  2: { id: "2", dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
  3: { id: "3", dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
  4: { id: "4", dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
  5: { id: "5", dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
  6: null, // Saturday - off
};

const rulesToWeeklySchedule = (
  rules: AvailabilityRule[] | undefined,
): Record<number, AvailabilityRule | null> => {
  if (!rules || rules.length === 0) return DEFAULT_WEEKLY_SCHEDULE;
  const byDay: Record<number, AvailabilityRule | null> = {
    0: null,
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
  };
  rules.forEach((rule) => {
    byDay[rule.dayOfWeek] = rule;
  });
  return byDay;
};

// Days of the week
const DAYS = [
  { key: 0, labelKey: "schedule.sunday" },
  { key: 1, labelKey: "schedule.monday" },
  { key: 2, labelKey: "schedule.tuesday" },
  { key: 3, labelKey: "schedule.wednesday" },
  { key: 4, labelKey: "schedule.thursday" },
  { key: 5, labelKey: "schedule.friday" },
  { key: 6, labelKey: "schedule.saturday" },
];

// Time slots for select
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
});

const toDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const ProviderSchedulePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { isLocked } = useSubscriptionStatus();
  const isArabic = i18n.language === "ar";

  // Current month/year for calendar
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  // Weekly availability rules — persisted on providers/{uid}.availabilityRules.
  const { data: providerProfile } = useProviderProfile(user?.uid || "");
  const updateProfileMutation = useUpdateProviderProfile();
  const [weeklySchedule, setWeeklySchedule] = useState<
    Record<number, AvailabilityRule | null>
  >(DEFAULT_WEEKLY_SCHEDULE);

  // Hydrate from Firestore once the provider's saved schedule loads. Only
  // runs once per profile fetch so it doesn't clobber in-progress edits.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!providerProfile || hydratedRef.current) return;
    hydratedRef.current = true;
    setWeeklySchedule(rulesToWeeklySchedule(providerProfile.availabilityRules));
    setExceptions(providerProfile.availabilityExceptions || []);
  }, [providerProfile]);

  // One-off date overrides (vacation days / extra availability) — persisted
  // on providers/{uid}.availabilityExceptions and consulted by the
  // getAvailableBookingSlots Cloud Function when a client books.
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);
  const [exceptionForm, setExceptionForm] = useState({
    date: toDateKey(new Date()),
    type: "BLOCK" as "BLOCK" | "EXTRA",
    startTime: "00:00",
    endTime: "23:30",
  });

  // Editing day
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    enabled: false,
    startTime: "09:00",
    endTime: "17:00",
  });

  // Fetch all bookings for this provider
  const { data: bookings = [] } = useProviderBookings(user?.uid || "");

  // Calendar navigation
  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: Date[] = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate]);

  const monthName = currentDate.toLocaleDateString(
    isArabic ? "ar-SA" : "en-US",
    {
      month: "long",
      year: "numeric",
    },
  );

  const openDayEditor = (day: number) => {
    if (isLocked) {
      toast.error(t("provider.accountLockedTitle"), {
        description: t("provider.accountLockedMessage"),
      });
      return;
    }
    const rule = weeklySchedule[day];
    setEditingDay(day);
    setEditForm({
      enabled: !!rule,
      startTime: rule?.startTime || "09:00",
      endTime: rule?.endTime || "17:00",
    });
    setScheduleDialogOpen(true);
  };

  const saveDaySchedule = async () => {
    if (editingDay === null || !user) return;

    const nextSchedule: Record<number, AvailabilityRule | null> = {
      ...weeklySchedule,
      [editingDay]: editForm.enabled
        ? {
            id: editingDay.toString(),
            dayOfWeek: editingDay,
            startTime: editForm.startTime,
            endTime: editForm.endTime,
          }
        : null,
    };

    setWeeklySchedule(nextSchedule);
    setScheduleDialogOpen(false);
    setEditingDay(null);

    const availabilityRules = Object.values(nextSchedule).filter(
      (rule): rule is AvailabilityRule => rule !== null,
    );

    try {
      await updateProfileMutation.mutateAsync({
        uid: user.uid,
        updates: { availabilityRules },
      });
    } catch (error) {
      console.error("Failed to save schedule:", error);
      toast.error(t("common.error"));
    }
  };

  const openExceptionDialog = (date?: Date) => {
    if (isLocked) {
      toast.error(t("provider.accountLockedTitle"), {
        description: t("provider.accountLockedMessage"),
      });
      return;
    }
    const dateKey = date ? toDateKey(date) : toDateKey(new Date());
    const existing = exceptions.find((ex) => ex.date === dateKey);
    setExceptionForm({
      date: dateKey,
      type: existing?.type || "BLOCK",
      startTime: existing?.startTime || "00:00",
      endTime: existing?.endTime || "23:30",
    });
    setExceptionDialogOpen(true);
  };

  const saveException = async () => {
    if (!user) return;
    if (exceptionForm.startTime >= exceptionForm.endTime) {
      toast.error(t("schedule.exceptionTimeOrderError"));
      return;
    }

    // Only one exception per exact date — a new save for the same date
    // replaces whatever was there before.
    const nextExceptions = [
      ...exceptions.filter((ex) => ex.date !== exceptionForm.date),
      {
        id: exceptionForm.date,
        date: exceptionForm.date,
        type: exceptionForm.type,
        startTime: exceptionForm.startTime,
        endTime: exceptionForm.endTime,
      },
    ];

    setExceptions(nextExceptions);
    setExceptionDialogOpen(false);

    try {
      await updateProfileMutation.mutateAsync({
        uid: user.uid,
        updates: { availabilityExceptions: nextExceptions },
      });
      toast.success(t("common.success"));
    } catch (error) {
      console.error("Failed to save exception:", error);
      toast.error(t("common.error"));
    }
  };

  const deleteException = async (dateKey: string) => {
    if (!user) return;
    const nextExceptions = exceptions.filter((ex) => ex.date !== dateKey);
    setExceptions(nextExceptions);
    try {
      await updateProfileMutation.mutateAsync({
        uid: user.uid,
        updates: { availabilityExceptions: nextExceptions },
      });
    } catch (error) {
      console.error("Failed to delete exception:", error);
      toast.error(t("common.error"));
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const hasBooking = (date: Date) => {
    return bookings.some((booking) => {
      const bookingDate = new Date(booking.startAt);
      return (
        bookingDate.getDate() === date.getDate() &&
        bookingDate.getMonth() === date.getMonth() &&
        bookingDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const isWorkDay = (date: Date) => {
    const day = date.getDay();
    return !!weeklySchedule[day];
  };

  const getException = (date: Date) => exceptions.find((ex) => ex.date === toDateKey(date));

  const sortedExceptions = useMemo(
    () => [...exceptions].sort((a, b) => (a.date < b.date ? -1 : 1)),
    [exceptions],
  );

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container py-4">
          <h1 className="text-xl font-semibold text-foreground">
            {t("nav.schedule")}
          </h1>
        </div>
      </header>

      <main className="container py-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        >
          {/* Weekly Schedule */}
          <motion.section variants={fadeInUp} className="mb-6">
            <h2 className="mb-3 font-medium text-foreground">
              {t("schedule.weeklyHours")}
            </h2>
            <div className="space-y-2">
              {DAYS.map((day) => {
                const rule = weeklySchedule[day.key];
                return (
                  <button
                    key={day.key}
                    onClick={() => openDayEditor(day.key)}
                    className="flex w-full items-center justify-between rounded-xl bg-card p-4 transition-colors hover:bg-accent"
                  >
                    <span className="font-medium text-foreground">
                      {t(day.labelKey)}
                    </span>
                    {rule ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {rule.startTime} - {rule.endTime}
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant="outline">{t("schedule.off")}</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.section>

          {/* Calendar View */}
          <motion.section variants={fadeInUp}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium text-foreground">
                {t("schedule.calendar")}
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
                </Button>
                <span className="min-w-32 text-center font-medium">
                  {monthName}
                </span>
                <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                  <ChevronRight className="h-5 w-5 rtl:rotate-180" />
                </Button>
              </div>
            </div>

            <div className="rounded-2xl bg-card p-4">
              {/* Day headers */}
              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                {DAYS.map((day) => (
                  <div key={day.key}>{t(day.labelKey).slice(0, 3)}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => {
                  const isWork = isWorkDay(date);
                  const hasAppt = hasBooking(date);
                  const exception = getException(date);
                  const today = isToday(date);
                  const inMonth = isCurrentMonth(date);

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(date)}
                      className={`relative flex h-10 items-center justify-center rounded-lg text-sm transition-colors ${
                        !inMonth
                          ? "text-muted-foreground/50"
                          : today
                            ? "bg-primary text-primary-foreground font-bold"
                            : exception?.type === "BLOCK"
                              ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                              : exception?.type === "EXTRA"
                                ? "bg-green-500/10 text-foreground hover:bg-green-500/20"
                                : isWork
                                  ? "bg-primary/10 text-foreground hover:bg-primary/20"
                                  : "text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {date.getDate()}
                      {hasAppt && (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-primary/10" />
                  <span>{t("schedule.workDay")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-muted" />
                  <span>{t("schedule.dayOff")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative h-3 w-3">
                    <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                  </div>
                  <span>{t("schedule.hasBooking")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-destructive/10" />
                  <span>{t("schedule.blockedDay")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-green-500/10" />
                  <span>{t("schedule.extraDay")}</span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Exceptions list */}
          <motion.section variants={fadeInUp} className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium text-foreground">{t("schedule.exceptions")}</h2>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => openExceptionDialog(selectedDate || undefined)}
              >
                <Plus className="h-4 w-4" />
                {t("schedule.addException")}
              </Button>
            </div>
            {sortedExceptions.length === 0 ? (
              <div className="rounded-2xl bg-card p-4 text-center text-sm text-muted-foreground">
                {t("schedule.noExceptions")}
              </div>
            ) : (
              <div className="space-y-2">
                {sortedExceptions.map((exception) => (
                  <div
                    key={exception.id}
                    className="flex items-center justify-between rounded-xl bg-card p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <CalendarOff className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{exception.date}</span>
                        <Badge variant={exception.type === "BLOCK" ? "destructive" : "default"}>
                          {t(`schedule.${exception.type === "BLOCK" ? "blockedDay" : "extraDay"}`)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {exception.startTime} - {exception.endTime}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteException(exception.date)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Selected Date Bookings */}
          {selectedDate && (
            <motion.section variants={fadeInUp}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-medium text-foreground">
                  {t("schedule.bookingsFor")}{" "}
                  {selectedDate.toLocaleDateString(
                    isArabic ? "ar-SA" : "en-US",
                    { weekday: "long", month: "short", day: "numeric" },
                  )}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="rounded-2xl bg-card p-4">
                {bookings.filter((b) => {
                  const bookingDate = new Date(b.startAt);
                  return (
                    bookingDate.getDate() === selectedDate.getDate() &&
                    bookingDate.getMonth() === selectedDate.getMonth() &&
                    bookingDate.getFullYear() === selectedDate.getFullYear()
                  );
                }).length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    {t("schedule.noBookings")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {bookings
                      .filter((b) => {
                        const bookingDate = new Date(b.startAt);
                        return (
                          bookingDate.getDate() === selectedDate.getDate() &&
                          bookingDate.getMonth() === selectedDate.getMonth() &&
                          bookingDate.getFullYear() ===
                            selectedDate.getFullYear()
                        );
                      })
                      .sort(
                        (a, b) =>
                          new Date(a.startAt).getTime() -
                          new Date(b.startAt).getTime(),
                      )
                      .map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between rounded-xl bg-muted p-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {new Date(booking.startAt).toLocaleTimeString(
                                  isArabic ? "ar-SA" : "en-US",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                                {" - "}
                                {new Date(booking.endAt).toLocaleTimeString(
                                  isArabic ? "ar-SA" : "en-US",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {booking.addressText}
                            </p>
                          </div>
                          <Badge
                            variant={
                              booking.status === "ACCEPTED" ||
                              booking.status === "CONFIRMED"
                                ? "default"
                                : booking.status === "PENDING"
                                  ? "secondary"
                                  : booking.status === "COMPLETED"
                                    ? "outline"
                                    : "destructive"
                            }
                          >
                            {t(`bookingStatus.${booking.status}`)}
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </motion.div>
      </main>

      {/* Edit Day Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDay !== null && t(DAYS[editingDay].labelKey)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Working this day */}
            <div className="flex items-center justify-between">
              <Label>{t("schedule.workingThisDay")}</Label>
              <Switch
                checked={editForm.enabled}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, enabled: checked })
                }
              />
            </div>

            {editForm.enabled && (
              <>
                {/* Start Time */}
                <div>
                  <Label>{t("schedule.startTime")}</Label>
                  <Select
                    value={editForm.startTime}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, startTime: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* End Time */}
                <div>
                  <Label>{t("schedule.endTime")}</Label>
                  <Select
                    value={editForm.endTime}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, endTime: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={saveDaySchedule} className="gap-2">
              <Save className="h-4 w-4" />
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Exception Dialog */}
      <Dialog open={exceptionDialogOpen} onOpenChange={setExceptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("schedule.addException")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="exception-date">{t("schedule.exceptionDate")}</Label>
              <input
                id="exception-date"
                type="date"
                value={exceptionForm.date}
                onChange={(e) =>
                  setExceptionForm({ ...exceptionForm, date: e.target.value })
                }
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <Label>{t("schedule.exceptionType")}</Label>
              <Select
                value={exceptionForm.type}
                onValueChange={(value) =>
                  setExceptionForm({ ...exceptionForm, type: value as "BLOCK" | "EXTRA" })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BLOCK">{t("schedule.blockedDay")}</SelectItem>
                  <SelectItem value="EXTRA">{t("schedule.extraDay")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  exceptionForm.type === "BLOCK"
                    ? "schedule.blockedDayHint"
                    : "schedule.extraDayHint",
                )}
              </p>
            </div>

            <div>
              <Label>{t("schedule.startTime")}</Label>
              <Select
                value={exceptionForm.startTime}
                onValueChange={(value) =>
                  setExceptionForm({ ...exceptionForm, startTime: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("schedule.endTime")}</Label>
              <Select
                value={exceptionForm.endTime}
                onValueChange={(value) =>
                  setExceptionForm({ ...exceptionForm, endTime: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExceptionDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveException} className="gap-2">
              <Save className="h-4 w-4" />
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderSchedulePage;
