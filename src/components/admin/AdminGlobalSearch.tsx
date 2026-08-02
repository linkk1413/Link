import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, User as UserIcon, ClipboardList, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useUsers } from "@/hooks/queries/useUsers";
import { useAllBookings } from "@/hooks/queries/useBookings";
import { useReports } from "@/hooks/queries/useReports";

const MAX_RESULTS_PER_GROUP = 5;

export const AdminGlobalSearch: React.FC<{ className?: string }> = ({
  className,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: users = [] } = useUsers();
  const { data: bookings = [] } = useAllBookings();
  const { data: reports = [] } = useReports();

  const providerNameMap = useMemo(() => {
    return users.reduce<Record<string, string>>((acc, u) => {
      if (u.uid) acc[u.uid] = u.displayName || u.name || u.email || "";
      return acc;
    }, {});
  }, [users]);

  const q = query.trim().toLowerCase();

  const matchedUsers = useMemo(() => {
    if (!q) return [];
    return users
      .filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q),
      )
      .slice(0, MAX_RESULTS_PER_GROUP);
  }, [users, q]);

  const matchedBookings = useMemo(() => {
    if (!q) return [];
    return bookings
      .filter(
        (b) =>
          b.id.toLowerCase().includes(q) ||
          b.clientName?.toLowerCase().includes(q) ||
          b.serviceName?.toLowerCase().includes(q) ||
          (providerNameMap[b.providerId] || "").toLowerCase().includes(q),
      )
      .slice(0, MAX_RESULTS_PER_GROUP);
  }, [bookings, q, providerNameMap]);

  const matchedReports = useMemo(() => {
    if (!q) return [];
    return reports
      .filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.reporterName?.toLowerCase().includes(q) ||
          r.targetOwnerName?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          String(r.reportNumber || "").includes(q),
      )
      .slice(0, MAX_RESULTS_PER_GROUP);
  }, [reports, q]);

  const hasResults =
    matchedUsers.length > 0 ||
    matchedBookings.length > 0 ||
    matchedReports.length > 0;

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const goTo = (path: string) => {
    close();
    navigate(path);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={cn("gap-2 text-muted-foreground", className)}
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">
          {t("admin.globalSearchPlaceholder")}
        </span>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <CommandInput
          placeholder={t("admin.globalSearchPlaceholder")}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {q.length > 0 && !hasResults && (
            <CommandEmpty>{t("admin.globalSearchNoResults")}</CommandEmpty>
          )}
          {matchedUsers.length > 0 && (
            <CommandGroup heading={t("admin.usersManagement")}>
              {matchedUsers.map((u) => (
                <CommandItem
                  key={u.uid}
                  value={`user-${u.uid}`}
                  onSelect={() => goTo(`/admin/users/${u.uid}`)}
                >
                  <UserIcon className="me-2 h-4 w-4 shrink-0" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate">{u.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {matchedBookings.length > 0 && (
            <CommandGroup heading={t("admin.ordersManagement")}>
              {matchedBookings.map((b) => (
                <CommandItem
                  key={b.id}
                  value={`order-${b.id}`}
                  onSelect={() =>
                    goTo(`/admin/orders?q=${encodeURIComponent(b.id)}`)
                  }
                >
                  <ClipboardList className="me-2 h-4 w-4 shrink-0" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate">
                      {b.serviceName || `#${b.id.slice(0, 8)}`}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {b.clientName} · #{b.id.slice(0, 8)}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {matchedReports.length > 0 && (
            <CommandGroup heading={t("adminReports.title")}>
              {matchedReports.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`report-${r.id}`}
                  onSelect={() => goTo(`/admin/reports/${r.id}`)}
                >
                  <Flag className="me-2 h-4 w-4 shrink-0" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate">
                      {r.reporterName || `#${r.id.slice(0, 8)}`}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {r.description ||
                        t(`report.reasons.${r.reason}`, {
                          defaultValue: r.reason,
                        })}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};
