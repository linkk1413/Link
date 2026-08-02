import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "@/lib/firestore";

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ["admin", "auditLogs"],
    queryFn: () => getAuditLogs(),
  });
};
