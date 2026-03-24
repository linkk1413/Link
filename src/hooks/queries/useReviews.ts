// React Query hooks for Reviews
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getReviews,
  getReviewByBooking,
  getReviewById,
  getReviewByClientAndProvider,
  createReview,
  updateReview,
  deleteReview,
} from "@/lib/firestore";
import { Review } from "@/types";
import { providerKeys } from "./useProviders";

// Query keys for cache management
export const reviewKeys = {
  all: ["reviews"] as const,
  byProvider: (providerId: string) =>
    ["reviews", "provider", providerId] as const,
  byService: (serviceId: string) => ["reviews", "service", serviceId] as const,
  byBooking: (bookingId: string) => ["reviews", "booking", bookingId] as const,
  byClientProvider: (clientId: string, providerId: string) =>
    ["reviews", "clientProvider", clientId, providerId] as const,
  detail: (reviewId: string) => ["reviews", "detail", reviewId] as const,
};

// Fetch reviews with optional filters
export const useReviews = (filters?: {
  providerId?: string;
  serviceId?: string;
}) => {
  const providerId = filters?.providerId;
  return useQuery<Review[], Error>({
    queryKey: providerId ? reviewKeys.byProvider(providerId) : reviewKeys.all,
    queryFn: () => getReviews(providerId || ""),
    enabled: !!providerId,
  });
};

// Fetch reviews for a provider
export const useProviderReviews = (providerId: string) => {
  return useQuery<Review[], Error>({
    queryKey: reviewKeys.byProvider(providerId),
    queryFn: () => getReviews(providerId),
    enabled: !!providerId,
  });
};

// Fetch review by booking ID (to check if review exists)
export const useReviewByBooking = (bookingId: string) => {
  return useQuery<Review | null, Error>({
    queryKey: reviewKeys.byBooking(bookingId),
    queryFn: () => getReviewByBooking(bookingId),
    enabled: !!bookingId,
  });
};

// Fetch review by client and provider (for open reviews)
export const useClientProviderReview = (clientId: string, providerId: string) => {
  return useQuery<Review | null, Error>({
    queryKey: reviewKeys.byClientProvider(clientId, providerId),
    queryFn: () => getReviewByClientAndProvider(clientId, providerId),
    enabled: !!clientId && !!providerId,
  });
};

// Fetch review by ID
export const useReviewById = (reviewId: string) => {
  return useQuery<Review | null, Error>({
    queryKey: reviewKeys.detail(reviewId),
    queryFn: () => getReviewById(reviewId),
    enabled: !!reviewId,
  });
};

// Create a new review
export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (review: Omit<Review, "id" | "createdAt">) =>
      createReview(review),
    onSuccess: (_, variables) => {
      // Invalidate provider reviews list
      queryClient.invalidateQueries({
        queryKey: reviewKeys.byProvider(variables.providerId),
      });
      // Invalidate booking review check if booking exists
      if (variables.bookingId) {
        queryClient.invalidateQueries({
          queryKey: reviewKeys.byBooking(variables.bookingId),
        });
      }
      // Invalidate client-provider review check
      queryClient.invalidateQueries({
        queryKey: reviewKeys.byClientProvider(variables.clientId, variables.providerId),
      });
      // Also invalidate provider profile to update rating
      queryClient.invalidateQueries({
        queryKey: providerKeys.detail(variables.providerId),
      });
      // Invalidate all providers list to update ratings in search
      queryClient.invalidateQueries({
        queryKey: providerKeys.all,
      });
    },
  });
};

// Update an existing review
export const useUpdateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      updates,
      providerId,
      bookingId,
      clientId,
    }: {
      reviewId: string;
      updates: { rating?: number; comment?: string };
      providerId: string;
      bookingId?: string;
      clientId?: string;
    }) => updateReview(reviewId, updates),
    onSuccess: (_, variables) => {
      // Invalidate review detail
      queryClient.invalidateQueries({
        queryKey: reviewKeys.detail(variables.reviewId),
      });
      // Invalidate provider reviews list
      queryClient.invalidateQueries({
        queryKey: reviewKeys.byProvider(variables.providerId),
      });
      // Invalidate booking review if exists
      if (variables.bookingId) {
        queryClient.invalidateQueries({
          queryKey: reviewKeys.byBooking(variables.bookingId),
        });
      }
      // Invalidate client-provider review if clientId provided
      if (variables.clientId) {
        queryClient.invalidateQueries({
          queryKey: reviewKeys.byClientProvider(variables.clientId, variables.providerId),
        });
      }
      // Invalidate provider profile to update rating
      queryClient.invalidateQueries({
        queryKey: providerKeys.detail(variables.providerId),
      });
      // Invalidate all providers list
      queryClient.invalidateQueries({
        queryKey: providerKeys.all,
      });
    },
  });
};

// Delete a review
export const useDeleteReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      providerId,
      bookingId,
      clientId,
    }: {
      reviewId: string;
      providerId: string;
      bookingId?: string;
      clientId?: string;
    }) => deleteReview(reviewId),
    onSuccess: (_, variables) => {
      // Invalidate review detail
      queryClient.invalidateQueries({
        queryKey: reviewKeys.detail(variables.reviewId),
      });
      // Invalidate provider reviews list
      queryClient.invalidateQueries({
        queryKey: reviewKeys.byProvider(variables.providerId),
      });
      // Invalidate booking review check if exists
      if (variables.bookingId) {
        queryClient.invalidateQueries({
          queryKey: reviewKeys.byBooking(variables.bookingId),
        });
      }
      // Invalidate client-provider review if clientId provided
      if (variables.clientId) {
        queryClient.invalidateQueries({
          queryKey: reviewKeys.byClientProvider(variables.clientId, variables.providerId),
        });
      }
      // Invalidate provider profile to update rating
      queryClient.invalidateQueries({
        queryKey: providerKeys.detail(variables.providerId),
      });
      // Invalidate all providers list
      queryClient.invalidateQueries({
        queryKey: providerKeys.all,
      });
    },
  });
};
