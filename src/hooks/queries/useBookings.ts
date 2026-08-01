// React Query hooks for Bookings
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import {
  getBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
} from "@/lib/firestore";
import { Booking, BookingStatus } from "@/types";

// Query keys for cache management
export const bookingKeys = {
  all: ["bookings"] as const,
  byClient: (clientId: string) => ["bookings", "client", clientId] as const,
  byProvider: (providerId: string) =>
    ["bookings", "provider", providerId] as const,
  byStatus: (status: BookingStatus) => ["bookings", "status", status] as const,
  detail: (id: string) => ["bookings", id] as const,
  availableSlots: (providerId: string, dateKey: string, durationMin: number) =>
    ["bookings", "availableSlots", providerId, dateKey, durationMin] as const,
};

// Fetch bookings for a client
export const useClientBookings = (clientId: string) => {
  return useQuery<Booking[], Error>({
    queryKey: bookingKeys.byClient(clientId),
    queryFn: () => getBookings({ clientId }),
    enabled: !!clientId,
    refetchOnMount: "always", // Always refetch when component mounts
  });
};

// Fetch bookings for a provider
export const useProviderBookings = (providerId: string) => {
  return useQuery<Booking[], Error>({
    queryKey: bookingKeys.byProvider(providerId),
    queryFn: () => getBookings({ providerId }),
    enabled: !!providerId,
    refetchOnMount: "always", // Always refetch when component mounts
  });
};

// Fetch pending bookings for a provider (booking requests)
export const usePendingBookings = (providerId: string) => {
  return useQuery<Booking[], Error>({
    queryKey: [...bookingKeys.byProvider(providerId), "pending"],
    queryFn: () => getBookings({ providerId, status: "PENDING" }),
    enabled: !!providerId,
  });
};

// Admin: every booking in the platform (no filter — firestore.rules already
// grants isAdmin() a blanket read on /bookings).
export const useAllBookings = () => {
  return useQuery<Booking[], Error>({
    queryKey: bookingKeys.all,
    queryFn: () => getBookings({}),
  });
};

// Fetch a single booking by ID
export const useBooking = (id: string) => {
  return useQuery<Booking | null, Error>({
    queryKey: bookingKeys.detail(id),
    queryFn: () => getBookingById(id),
    enabled: !!id,
  });
};

// Free "HH:mm" start times for a provider on a given local date, computed
// server-side (getAvailableBookingSlots Cloud Function) since a browsing
// client has no read access to other clients' booking documents.
export const useAvailableSlots = (
  providerId: string,
  dateKey: string,
  durationMin: number,
) => {
  return useQuery<string[], Error>({
    queryKey: bookingKeys.availableSlots(providerId, dateKey, durationMin),
    queryFn: async () => {
      const call = httpsCallable<
        { providerId: string; date: string; durationMin: number },
        { slots: string[] }
      >(functions, "getAvailableBookingSlots");
      const result = await call({ providerId, date: dateKey, durationMin });
      return result.data.slots;
    },
    enabled: !!providerId && !!dateKey && durationMin > 0,
    staleTime: 0, // always re-check freshness before showing/confirming a slot
  });
};

// Create a new booking
export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (booking: Omit<Booking, "id" | "createdAt" | "updatedAt">) =>
      createBooking(booking),
    onSuccess: (_, variables) => {
      // Invalidate relevant booking lists
      queryClient.invalidateQueries({
        queryKey: bookingKeys.byClient(variables.clientId),
      });
      queryClient.invalidateQueries({
        queryKey: bookingKeys.byProvider(variables.providerId),
      });
    },
  });
};

// Update booking status (accept, reject, complete, cancel, etc.)
export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      updateBookingStatus(id, status),
    onSuccess: (_, variables) => {
      // Invalidate the specific booking and all lists
      queryClient.invalidateQueries({
        queryKey: bookingKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
};

// Helper hook to get booking status actions
export const getBookingActions = (
  status: BookingStatus,
  isProvider: boolean,
) => {
  const actions: {
    label: string;
    status: BookingStatus;
    variant: "default" | "destructive" | "outline";
  }[] = [];

  if (isProvider) {
    switch (status) {
      case "PENDING":
        actions.push(
          { label: "Accept", status: "ACCEPTED", variant: "default" },
          { label: "Reject", status: "REJECTED", variant: "destructive" },
        );
        break;
      case "ACCEPTED":
        actions.push(
          { label: "Start", status: "IN_PROGRESS", variant: "default" },
          {
            label: "Cancel",
            status: "CANCELLED_BY_PROVIDER",
            variant: "destructive",
          },
        );
        break;
      case "IN_PROGRESS":
        actions.push({
          label: "Complete",
          status: "COMPLETED",
          variant: "default",
        });
        break;
    }
  } else {
    // Client actions
    switch (status) {
      case "PENDING":
      case "ACCEPTED":
        actions.push({
          label: "Cancel",
          status: "CANCELLED_BY_CLIENT",
          variant: "destructive",
        });
        break;
    }
  }

  return actions;
};
