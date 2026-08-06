// React Query hooks for Services
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  DEFAULT_SERVICES,
} from "@/lib/firestore";
import { Service } from "@/types";

// Query keys for cache management
export const serviceKeys = {
  all: ["services"] as const,
  list: (filters?: {
    categoryId?: string;
    providerId?: string;
    isActive?: boolean;
  }) => ["services", "list", filters] as const,
  detail: (id: string) => ["services", id] as const,
  byProvider: (providerId: string) =>
    ["services", "provider", providerId] as const,
  byCategory: (categoryId: string) =>
    ["services", "category", categoryId] as const,
};

// Fetch services with optional filters
export const useServices = (filters?: {
  categoryId?: string;
  providerId?: string;
  isActive?: boolean;
}) => {
  return useQuery<Service[], Error>({
    queryKey: serviceKeys.list(filters),
    queryFn: () => getServices(filters),
  });
};

// Fetch services by provider. By default includes inactive services (for
// the provider's own management page). Pass isActiveOnly for client-facing
// views (e.g. a provider's public profile) so services hidden by an
// expired/locked subscription don't leak through a direct profile link.
export const useProviderServices = (
  providerId: string,
  isActiveOnly?: boolean,
) => {
  return useQuery<Service[], Error>({
    queryKey: [...serviceKeys.byProvider(providerId), { isActiveOnly }],
    queryFn: async () => {
      const services = await getServices({
        providerId,
        ...(isActiveOnly ? { isActive: true } : {}),
      });
      // If no services found and it's a mock provider, return mock services
      if (services.length === 0 && providerId.startsWith("provider-")) {
        return DEFAULT_SERVICES.filter((s) => s.providerId === providerId);
      }
      return services;
    },
    enabled: !!providerId,
  });
};

// Fetch services by category
export const useCategoryServices = (categoryId: string) => {
  return useQuery<Service[], Error>({
    queryKey: serviceKeys.byCategory(categoryId),
    queryFn: () => getServices({ categoryId, isActive: true }),
    enabled: !!categoryId,
  });
};

// Fetch a single service by ID
export const useService = (id: string) => {
  return useQuery<Service | null, Error>({
    queryKey: serviceKeys.detail(id),
    queryFn: () => getServiceById(id),
    enabled: !!id,
  });
};

// Create a new service
export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (service: Omit<Service, "id" | "createdAt" | "updatedAt">) =>
      createService(service),
    onSuccess: (_, variables) => {
      // Invalidate services list to refetch
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      queryClient.invalidateQueries({
        queryKey: serviceKeys.byProvider(variables.providerId),
      });
    },
  });
};

// Update an existing service
export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Service> }) =>
      updateService(id, updates),
    onSuccess: (_, variables) => {
      // Invalidate specific service and lists
      queryClient.invalidateQueries({
        queryKey: serviceKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
  });
};

// Delete a service
export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => {
      // Invalidate all service queries
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
  });
};
