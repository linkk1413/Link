// React Query hooks for Reports
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createReport,
  getReports,
  getReportsByReporter,
  updateReportStatus,
} from "@/lib/firestore";
import { Report, ReportStatus, ReportTargetType } from "@/types";

export const reportKeys = {
  all: ["reports"] as const,
  byStatus: (status: ReportStatus) => ["reports", "status", status] as const,
  byReporter: (reporterId: string) =>
    ["reports", "reporter", reporterId] as const,
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

// Create a report
export const useCreateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Report, "id" | "createdAt" | "status">) =>
      createReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
};

// Update report status (admin)
export const useUpdateReportStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reportId,
      status,
      adminNotes,
      resolvedBy,
    }: {
      reportId: string;
      status: ReportStatus;
      adminNotes?: string;
      resolvedBy?: string;
    }) => updateReportStatus(reportId, status, adminNotes, resolvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
};
