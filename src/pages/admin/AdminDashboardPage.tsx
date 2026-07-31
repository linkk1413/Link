import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  CheckCircle,
  CreditCard,
  Activity,
  Gift,
  Briefcase,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { useUsers } from "@/hooks/queries/useUsers";
import { usePendingVerifications } from "@/hooks/queries/useVerifications";
import { usePayouts } from "@/hooks/queries/usePayouts";
import { usePayments } from "@/hooks/queries/usePayments";
import { useAllBookings } from "@/hooks/queries/useBookings";
import { getBookings, getProvidersByIds } from "@/lib/firestore";
import { BookingStatus } from "@/types";

const AdminDashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";

  const { data: users = [] } = useUsers();
  const { data: verifications = [] } = usePendingVerifications();
  const { data: payouts = [] } = usePayouts();
  const { data: payments = [] } = usePayments();
  const { data: allBookings = [] } = useAllBookings();

  const { data: activeBookingsCount = 0 } = useQuery({
    queryKey: ["admin", "bookings", "active"],
    queryFn: async () => {
      const activeStatuses: BookingStatus[] = [
        "PENDING",
        "ACCEPTED",
        "CONFIRMED",
        "IN_PROGRESS",
      ];
      const results = await Promise.all(
        activeStatuses.map((status) => getBookings({ status })),
      );
      return results.reduce((sum, list) => sum + list.length, 0);
    },
  });

  // Fetch subscription stats and profit data
  const {
    data: subscriptionStats = {
      active: 0,
      expired: 0,
      mrr: 0,
      yourProfit: 0,
      payoutsOwed: 0,
    },
  } = useQuery({
    queryKey: ["admin", "subscriptions", "stats"],
    queryFn: async () => {
      const providerUsers = users.filter(
        (u) => u.roles?.includes("PROVIDER") || u.role === "PROVIDER",
      );
      const profiles = await getProvidersByIds(
        providerUsers.map((u) => u.uid),
      );

      let activeCount = 0;
      let expiredCount = 0;
      let totalMRR = 0;
      let yourProfit = 0;
      let payoutsOwed = 0;

      for (const profile of profiles) {
        if (
          profile.subscriptionStatus === "ACTIVE" &&
          profile.accountStatus === "ACTIVE"
        ) {
          activeCount++;
          const planPrice = Number(profile.subscriptionPrice) || 10;
          totalMRR += planPrice;

          // Calculate your profit = money already received from provider
          if (profile.lastSubscriptionPaymentAmount) {
            yourProfit += Number(profile.lastSubscriptionPaymentAmount) || 0;
          }
        }
        if (profile.subscriptionStatus === "EXPIRED") {
          expiredCount++;
        }
      }

      // Payouts owed = MRR - Already received
      payoutsOwed = totalMRR - yourProfit;

      return {
        active: activeCount,
        expired: expiredCount,
        mrr: totalMRR,
        yourProfit,
        payoutsOwed,
      };
    },
  });

  const pendingVerifications = useMemo(
    () => verifications.filter((v) => v.status === "PENDING").length,
    [verifications],
  );

  const clientCount = useMemo(
    () => users.filter((u) => u.roles?.includes("CLIENT") || u.role === "CLIENT").length,
    [users],
  );
  const providerCount = useMemo(
    () => users.filter((u) => u.roles?.includes("PROVIDER") || u.role === "PROVIDER").length,
    [users],
  );
  const completedBookingsCount = useMemo(
    () => allBookings.filter((b) => b.status === "COMPLETED").length,
    [allBookings],
  );
  const cancelledBookingsCount = useMemo(
    () =>
      allBookings.filter((b) =>
        ["CANCELLED_BY_CLIENT", "CANCELLED_BY_PROVIDER", "REJECTED"].includes(
          b.status,
        ),
      ).length,
    [allBookings],
  );

  // Platform profit = sum of platformFee on captured payments. Only
  // meaningful for bookings made after commission was activated (see
  // finalizeMoyasarBooking.ts) — older payments have platformFee 0.
  const { totalProfit, monthlyProfit } = useMemo(() => {
    const now = new Date();
    let total = 0;
    let monthly = 0;
    payments
      .filter((p) => p.status === "CAPTURED")
      .forEach((p) => {
        const fee = Number(p.platformFee) || 0;
        total += fee;
        const created = new Date(p.createdAt);
        if (
          created.getFullYear() === now.getFullYear() &&
          created.getMonth() === now.getMonth()
        ) {
          monthly += fee;
        }
      });
    return { totalProfit: total, monthlyProfit: monthly };
  }, [payments]);

  const pendingPayouts = useMemo(
    () => payouts.filter((p) => p.status === "REQUESTED").length,
    [payouts],
  );

  const totalPayments = payments.length;
  const totalAmounts = useMemo(() => {
    return payments.reduce<Record<string, number>>((acc, payment) => {
      const currency = payment.currency || "USD";
      acc[currency] = (acc[currency] || 0) + (Number(payment.amount) || 0);
      return acc;
    }, {});
  }, [payments]);

  const providerNameMap = useMemo(() => {
    return users.reduce<Record<string, string>>((acc, user) => {
      if (user.uid) {
        acc[user.uid] = user.displayName || user.name || user.email || "";
      }
      return acc;
    }, {});
  }, [users]);

  const [paymentsRange, setPaymentsRange] = React.useState<
    "days" | "weeks" | "months"
  >("days");
  const [usersRange, setUsersRange] = React.useState<
    "days" | "weeks" | "months"
  >("days");

  const paymentsOverTime = useMemo(() => {
    const totals = new Map<string, number>();

    const startOfWeek = (date: Date) => {
      const start = new Date(date);
      const day = start.getDay();
      const diff = (day + 6) % 7;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      return start;
    };

    const startOfMonth = (date: Date) => {
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      return start;
    };

    const keyFor = (date: Date) => {
      if (paymentsRange === "weeks") {
        return startOfWeek(date).toISOString().split("T")[0];
      }
      if (paymentsRange === "months") {
        return startOfMonth(date).toISOString().split("T")[0];
      }
      return date.toISOString().split("T")[0];
    };

    payments.forEach((payment) => {
      const date = new Date(payment.createdAt);
      const key = keyFor(date);
      const amount = Number(payment.amountSar || payment.amount) || 0;
      totals.set(key, (totals.get(key) || 0) + amount);
    });

    const now = new Date();
    const buckets =
      paymentsRange === "months" ? 12 : paymentsRange === "weeks" ? 12 : 14;
    const range = Array.from({ length: buckets }, (_, index) => {
      const date = new Date(now);
      if (paymentsRange === "months") {
        date.setMonth(now.getMonth() - (buckets - 1 - index));
        const key = startOfMonth(date).toISOString().split("T")[0];
        return { key, date: startOfMonth(date) };
      }
      if (paymentsRange === "weeks") {
        date.setDate(now.getDate() - 7 * (buckets - 1 - index));
        const key = startOfWeek(date).toISOString().split("T")[0];
        return { key, date: startOfWeek(date) };
      }
      date.setDate(now.getDate() - (buckets - 1 - index));
      const key = date.toISOString().split("T")[0];
      return { key, date };
    });

    const result = range.map(({ key, date }) => ({
      date:
        paymentsRange === "months"
          ? date.toLocaleDateString(locale, { month: "short", year: "2-digit" })
          : date.toLocaleDateString(locale, { month: "short", day: "numeric" }),
      total: totals.get(key) || 0,
    }));

    return result;
  }, [payments, locale, paymentsRange]);

  const newUsersOverTime = useMemo(() => {
    const totals = new Map<string, number>();
    const startOfWeek = (date: Date) => {
      const start = new Date(date);
      const day = start.getDay();
      const diff = (day + 6) % 7;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      return start;
    };

    const startOfMonth = (date: Date) => {
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      return start;
    };

    const keyFor = (date: Date) => {
      if (usersRange === "weeks") {
        return startOfWeek(date).toISOString().split("T")[0];
      }
      if (usersRange === "months") {
        return startOfMonth(date).toISOString().split("T")[0];
      }
      return date.toISOString().split("T")[0];
    };

    users.forEach((user) => {
      const date = new Date(user.createdAt);
      const key = keyFor(date);
      totals.set(key, (totals.get(key) || 0) + 1);
    });

    const now = new Date();
    const buckets =
      usersRange === "months" ? 12 : usersRange === "weeks" ? 12 : 14;
    const range = Array.from({ length: buckets }, (_, index) => {
      const date = new Date(now);
      if (usersRange === "months") {
        date.setMonth(now.getMonth() - (buckets - 1 - index));
        const key = startOfMonth(date).toISOString().split("T")[0];
        return { key, date: startOfMonth(date) };
      }
      if (usersRange === "weeks") {
        date.setDate(now.getDate() - 7 * (buckets - 1 - index));
        const key = startOfWeek(date).toISOString().split("T")[0];
        return { key, date: startOfWeek(date) };
      }
      date.setDate(now.getDate() - (buckets - 1 - index));
      const key = date.toISOString().split("T")[0];
      return { key, date };
    });

    return range.map(({ key, date }) => {
      const monthLabel = date.toLocaleDateString(locale, { month: "short" });
      const dayLabel = date.toLocaleDateString(locale, { day: "numeric" });
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const dateLabel =
        usersRange === "months"
          ? date.toLocaleDateString(locale, { month: "short", year: "2-digit" })
          : date.toLocaleDateString(locale, { month: "short", day: "numeric" });

      return {
        date: dateLabel,
        monthKey,
        monthLabel,
        dayLabel,
        total: totals.get(key) || 0,
      };
    });
  }, [users, locale, usersRange]);

  const providerEarnings = useMemo(() => {
    if (payments.length === 0) return [];
    const captured = payments.filter((p) => p.status === "CAPTURED");
    const source = captured.length > 0 ? captured : payments;

    const totals = new Map<string, number>();
    source.forEach((payment) => {
      const amount = Number(payment.amountSar || payment.amount) || 0;
      totals.set(
        payment.providerId,
        (totals.get(payment.providerId) || 0) + amount,
      );
    });

    return Array.from(totals.entries())
      .map(([providerId, total]) => ({
        providerId,
        name: providerNameMap[providerId] || t("admin.notProvided"),
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [payments, providerNameMap, t]);

  const paymentsChartOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "line",
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      stroke: { width: 3, curve: "smooth" },
      grid: { strokeDashArray: 4 },
      xaxis: {
        categories: paymentsOverTime.map((item) => item.date),
        labels: { rotate: -20 },
      },
      yaxis: {
        labels: {
          formatter: (value) => value.toFixed(0),
        },
      },
      colors: ["#3b82f6"],
      dataLabels: { enabled: false },
      tooltip: { theme: "dark" },
    }),
    [paymentsOverTime],
  );

  const paymentsSeries = [
    {
      name: t("admin.totalAmount"),
      data: paymentsOverTime.map((item) => Number(item.total.toFixed(2))),
    },
  ];

  const usersChartOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "line",
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      stroke: { width: 3, curve: "smooth" },
      grid: { strokeDashArray: 4 },
      xaxis: {
        categories: newUsersOverTime.map((item, index) => {
          if (usersRange === "months") {
            return item.monthLabel;
          }

          const previous = index > 0 ? newUsersOverTime[index - 1] : null;
          if (!previous || previous.monthKey !== item.monthKey) {
            return `${item.monthLabel} ${item.dayLabel}`.trim();
          }

          return item.dayLabel;
        }),
        labels: { rotate: -20 },
      },
      yaxis: {
        labels: {
          formatter: (value) => value.toFixed(0),
        },
      },
      colors: ["#10b981"],
      dataLabels: { enabled: false },
      tooltip: { theme: "dark" },
    }),
    [newUsersOverTime, usersRange],
  );

  const usersSeries = [
    {
      name: t("admin.totalUsers"),
      data: newUsersOverTime.map((item) => item.total),
    },
  ];

  const earningsChartOptions: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: "50%",
      },
    },
    grid: { strokeDashArray: 4 },
    xaxis: {
      categories: providerEarnings.map((item) => item.name),
      labels: { rotate: -20 },
    },
    yaxis: {
      labels: {
        formatter: (value) => value.toFixed(0),
      },
    },
    colors: ["hsl(var(--chart-3))"],
    dataLabels: { enabled: false },
    tooltip: { theme: "dark" },
  };

  const earningsSeries = [
    {
      name: t("admin.totalAmount"),
      data: providerEarnings.map((item) => Number(item.total.toFixed(2))),
    },
  ];

  const recentPayments = payments.slice(0, 5);

  const stats = [
    {
      icon: <Users className="h-6 w-6" />,
      label: t("admin.clientCount"),
      value: clientCount.toString(),
      color: "bg-blue-500",
    },
    {
      icon: <Briefcase className="h-6 w-6" />,
      label: t("admin.providerCount"),
      value: providerCount.toString(),
      color: "bg-indigo-500",
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      label: t("admin.pendingVerifications"),
      value: pendingVerifications.toString(),
      color: "bg-amber-500",
    },
    {
      icon: <Activity className="h-6 w-6" />,
      label: t("admin.activeBookings"),
      value: activeBookingsCount.toString(),
      color: "bg-primary",
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      label: t("admin.completedOrders"),
      value: completedBookingsCount.toString(),
      color: "bg-teal-600",
    },
    {
      icon: <XCircle className="h-6 w-6" />,
      label: t("admin.cancelledOrders"),
      value: cancelledBookingsCount.toString(),
      color: "bg-rose-600",
    },
    {
      icon: <Gift className="h-6 w-6" />,
      label: t("admin.activeSubscriptions"),
      value: subscriptionStats.active.toString(),
      color: "bg-purple-500",
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      label: t("admin.mrr"),
      value: `${subscriptionStats.mrr.toFixed(0)} SAR`,
      color: "bg-blue-600",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      label: t("admin.totalPlatformProfit"),
      value: `${totalProfit.toFixed(0)} SAR`,
      color: "bg-green-600",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      label: t("admin.monthlyPlatformProfit"),
      value: `${monthlyProfit.toFixed(0)} SAR`,
      color: "bg-emerald-600",
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      label: t("admin.yourProfit"),
      value: `${subscriptionStats.yourProfit.toFixed(0)} SAR`,
      color: "bg-cyan-600",
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      label: t("admin.payoutsOwed"),
      value: `${subscriptionStats.payoutsOwed.toFixed(0)} SAR`,
      color: "bg-orange-600",
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="mb-6 text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
        {t("admin.title")}
      </h1>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div
                className={`rounded-lg ${stat.color} p-1.5 sm:p-2 text-white`}
              >
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-card-foreground">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.payments")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.keys(totalAmounts).length === 0 ? (
                <p className="text-muted-foreground">{t("admin.noPayments")}</p>
              ) : (
                Object.entries(totalAmounts).map(([currency, amount]) => (
                  <div
                    key={currency}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-muted-foreground">
                      {t("admin.totalAmount")} ({currency})
                    </span>
                    <span className="font-semibold">
                      {amount.toFixed(2)} {currency}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.recentPayments")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-muted-foreground">{t("admin.noPayments")}</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {providerNameMap[payment.providerId] ||
                          t("admin.notProvided")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.status} •{" "}
                        {payment.createdAt
                          ? new Date(payment.createdAt).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {(Number(payment.amount) || 0).toFixed(2)} {payment.currency}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>{t("admin.paymentsOverTime")}</CardTitle>
              <Tabs
                value={paymentsRange}
                onValueChange={(value) =>
                  setPaymentsRange(value as "days" | "weeks" | "months")
                }
              >
                <TabsList>
                  <TabsTrigger value="days">{t("admin.days")}</TabsTrigger>
                  <TabsTrigger value="weeks">{t("admin.weeks")}</TabsTrigger>
                  <TabsTrigger value="months">{t("admin.months")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {paymentsOverTime.length === 0 ? (
              <p className="text-muted-foreground">{t("admin.noPayments")}</p>
            ) : (
              <div className="h-[260px]">
                <ReactApexChart
                  key={`payments-${paymentsRange}-${paymentsSeries[0]?.data.join(",")}`}
                  type="line"
                  height={260}
                  options={paymentsChartOptions}
                  series={paymentsSeries}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>{t("admin.newUsersOverTime")}</CardTitle>
              <Tabs
                value={usersRange}
                onValueChange={(value) =>
                  setUsersRange(value as "days" | "weeks" | "months")
                }
              >
                <TabsList>
                  <TabsTrigger value="days">{t("admin.days")}</TabsTrigger>
                  <TabsTrigger value="weeks">{t("admin.weeks")}</TabsTrigger>
                  <TabsTrigger value="months">{t("admin.months")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {newUsersOverTime.length === 0 ? (
              <p className="text-muted-foreground">{t("admin.noUsers")}</p>
            ) : (
              <div className="h-[260px]">
                <ReactApexChart
                  key={`users-${usersRange}-${usersSeries[0]?.data.join(",")}`}
                  type="line"
                  height={260}
                  options={usersChartOptions}
                  series={usersSeries}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {providerEarnings.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.providerEarningsLeaderboard")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ReactApexChart
                  type="bar"
                  height={280}
                  options={earningsChartOptions}
                  series={earningsSeries}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  );
};

export default AdminDashboardPage;
