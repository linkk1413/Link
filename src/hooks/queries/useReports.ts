// React Query hooks for Reports
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createReport,
  getReports,
  getReportById,
  getReportsByReporter,
  updateReportStatus,
  getReportInternalNotes,
  addReportInternalNote,
  deleteReport,
  sendReportMessage,
  subscribeToReport,
  subscribeToReportActivity,
} from "@/lib/firestore";
import { Report, ReportActivityEntry, ReportStatus } from "@/types";

export const reportKeys = {
  all: ["reports"] as const,
  byStatus: (status: ReportStatus) => ["reports", "status", status] as const,
  byReporter: (reporterId: string) =>
    ["reports", "reporter", reporterId] as const,
  detail: (reportId: string) => ["reports", "detail", reportId] as const,
  notes: (reportId: string) => ["reports", reportId, "notes"] as const,
};

// Fetch all reports (admin)
export const useReports = (statusFilter?: ReportStatus) => {
  return useQuery<Report[], Error>({
    queryKey: statusFilter ? reportKeys.byStatus(statusFilter) : reportKeys.all,
    queryFn: () => getReports(statusFilter),
  });
};

// Fetch reports by reporter
export const useReportsByReporter = (reporterId: string) => {
  return useQuery<Report[], Error>({
    queryKey: reportKeys.byReporter(reporterId),
    queryFn: () => getReportsByReporter(reporterId),
    enabled: !!reporterId,
  });
};

// Fetch a single report (admin detail page)
export const useReport = (reportId: string) => {
  return useQuery<Report | null, Error>({
    queryKey: reportKeys.detail(reportId),
    queryFn: () => getReportById(reportId),
    enabled: !!reportId,
  });
};

// Create a report
export const useCreateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Omit<Report, "id" | "createdAt" | "status" | "reportNumber">,
    ) => createReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
};

// Update report status (admin) — also covers reopening (move back to an
// active status) and closing, both are just a status change.
export const useUpdateReportStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reportId,
      status,
      resolvedBy,
      resolvedByName,
    }: {
      reportId: string;
      status: ReportStatus;
      resolvedBy?: string;
      resolvedByName?: string;
    }) => updateReportStatus(reportId, status, resolvedBy, resolvedByName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
      queryClient.invalidateQueries({
        queryKey: reportKeys.detail(variables.reportId),
      });
    },
  });
};

// Internal (admin-only) notes on a report
export const useReportInternalNotes = (reportId: string) => {
  return useQuery({
    queryKey: reportKeys.notes(reportId),
    queryFn: () => getReportInternalNotes(reportId),
    enabled: !!reportId,
  });
};

export const useAddReportInternalNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reportId,
      authorId,
      note,
      authorName,
    }: {
      reportId: string;
      authorId: string;
      note: string;
      authorName?: string;
    }) => addReportInternalNote(reportId, authorId, note, authorName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: reportKeys.notes(variables.reportId),
      });
    },
  });
};

// Permanently delete a report (admin only). Irreversible.
export const useDeleteReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
};

// Live report status — "follow your complaint moment-to-moment" needs a
// push update on every write, not a query that only refetches on its own
// schedule. Mirrors useChatMessages' onSnapshot pattern.
export const useReportLive = (reportId: string) => {
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!reportId) {
      setReport(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsubscribe = subscribeToReport(reportId, (data) => {
      setReport(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [reportId]);

  return { data: report, isLoading };
};

// Live activity feed (timeline + messages) for a report.
export const useReportActivityLive = (reportId: string) => {
  const [entries, setEntries] = useState<ReportActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!reportId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsubscribe = subscribeToReportActivity(reportId, (data) => {
      setEntries(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [reportId]);

  return { data: entries, isLoading };
};

// Send a message on a report — either side (the reporter, or an admin).
export const useSendReportMessage = () => {
  return useMutation({
    mutationFn: ({
      reportId,
      actorId,
      actorRole,
      message,
      actorName,
    }: {
      reportId: string;
      actorId: string;
      actorRole: "ADMIN" | "USER";
      message: string;
      actorName?: string;
    }) => sendReportMessage(reportId, actorId, actorRole, message, actorName),
  });
};
