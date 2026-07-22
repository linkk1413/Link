// React Query hooks for Providers
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProviderProfile,
  getVerifiedProviders,
  getProvidersByIds,
  createProviderProfile,
  updateProviderProfile,
} from "@/lib/firestore";
import { ProviderProfile } from "@/types";

// Query keys for cache management
export const providerKeys = {
  all: ["providers"] as const,
  verified: (limit?: number) => ["providers", "verified", limit] as const,
  byIds: (uids: string[]) =>
    ["providers", "byIds", uids.sort().join(",")] as const,
  detail: (uid: string) => ["providers", uid] as const,
};

// Fetch verified providers (for client discovery)
export const useVerifiedProviders = (limit = 20) => {
  return useQuery<ProviderProfile[], Error>({
    queryKey: providerKeys.verified(limit),
    queryFn: () => getVerifiedProviders(limit),
  });
};

// Fetch providers by a list of IDs
export const useProvidersByIds = (uids: string[]) => {
  return useQuery<ProviderProfile[], Error>({
    queryKey: providerKeys.byIds(uids),
    queryFn: () => getProvidersByIds(uids),
    enabled: uids.length > 0,
  });
};

// Fetch a single provider profile by UID
export const useProviderProfile = (uid: string) => {
  return useQuery<ProviderProfile | null, Error>({
    queryKey: providerKeys.detail(uid),
    queryFn: () => getProviderProfile(uid),
    enabled: !!uid,
    // Always refetch on mount so the subscription banner reflects a fresh
    // renewal instead of a cached (still-expired) profile.
    refetchOnMount: "always",
  });
};

// Create a new provider profile (during provider onboarding)
export const useCreateProviderProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      uid,
      profile,
    }: {
      uid: string;
      profile: Omit<
        ProviderProfile,
        | "uid"
        | "updatedAt"
        | "ratingAvg"
        | "ratingCount"
        | "isVerified"
        | "identityVerified"
      >;
    }) => createProviderProfile(uid, profile),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: providerKeys.detail(variables.uid),
      });
      queryClient.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
};

// Update provider profile
export const useUpdateProviderProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      uid,
      updates,
    }: {
      uid: string;
      updates: Partial<ProviderProfile>;
    }) => updateProviderProfile(uid, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: providerKeys.detail(variables.uid),
      });
    },
  });
};
