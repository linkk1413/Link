// React Query hooks for Categories
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCategories,
  getCategoryById,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "@/lib/firestore";
import { Category } from "@/types";

// Query keys for cache management
export const categoryKeys = {
  all: ["categories"] as const,
  allAdmin: ["categories", "admin"] as const,
  detail: (id: string) => ["categories", id] as const,
};

// Fetch all active categories
export const useCategories = () => {
  return useQuery<Category[], Error>({
    queryKey: categoryKeys.all,
    queryFn: getCategories,
    staleTime: 1000 * 60 * 10, // Categories rarely change, cache for 10 minutes
  });
};

// Fetch ALL categories (including inactive) for admin
export const useAllCategories = () => {
  return useQuery<Category[], Error>({
    queryKey: categoryKeys.allAdmin,
    queryFn: getAllCategories,
    staleTime: 1000 * 60 * 5,
  });
};

// Fetch a single category by ID
export const useCategory = (id: string) => {
  return useQuery<Category | null, Error>({
    queryKey: categoryKeys.detail(id),
    queryFn: () => getCategoryById(id),
    enabled: !!id,
  });
};

// Create a new category
export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (category: Omit<Category, "id">) => createCategory(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: categoryKeys.allAdmin });
    },
  });
};

// Update a category
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Category, "id">>;
    }) => updateCategory(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: categoryKeys.allAdmin });
    },
  });
};

// Persist a new drag-and-drop order for the admin categories list
export const useReorderCategories = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderCategories(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: categoryKeys.allAdmin });
    },
  });
};

// Delete a category
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: categoryKeys.allAdmin });
    },
  });
};
