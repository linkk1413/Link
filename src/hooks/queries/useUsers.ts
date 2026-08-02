// React Query hooks for Users (Admin)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  doc,
  getDoc,
  updateDoc,
  orderBy,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import { getLoginHistory } from "@/lib/firestore";
import { User, UserRole, UserStatus } from "@/types";

// Query keys
export const userKeys = {
  all: ["users"] as const,
  detail: (id: string) => ["users", id] as const,
  client: (id: string) => ["users", "client", id] as const,
};

// Helper function to get client display name with fallbacks
const getClientDisplayName = async (clientId: string): Promise<string> => {
  if (!clientId) return "";

  try {
    // First try users collection
    const userRef = doc(db, "users", clientId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.displayName) return data.displayName;
      if (data.name) return data.name;
      if (data.email) return data.email.split("@")[0];
    }

    // If no user doc, try providers collection (in case client is also a provider)
    const providerRef = doc(db, "providers", clientId);
    const providerSnap = await getDoc(providerRef);

    if (providerSnap.exists()) {
      const data = providerSnap.data();
      if (data.displayName) return data.displayName;
    }
  } catch (error) {
    console.error("Error fetching client name:", error);
  }

  return "";
};

// Hook to fetch client name specifically (similar to useProviderProfile)
export const useClientName = (clientId: string) => {
  return useQuery<string, Error>({
    queryKey: userKeys.client(clientId),
    queryFn: () => getClientDisplayName(clientId),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

// Fetch all users
export const useUsers = () => {
  return useQuery<User[], Error>({
    queryKey: userKeys.all,
    queryFn: async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        const users = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            uid: doc.id,
            email: data.email || "",
            name: data.name || "",
            displayName: data.displayName || data.name || "",
            roles: data.roles || [], // Multi-role support
            role: data.role || null, // Legacy field
            activeRole: data.activeRole || null,
            status: data.status || "ACTIVE",
            phone: data.phone || "",
            region: data.region || "",
            city: data.city || "",
            district: data.district || "",
            notificationsEnabled: data.notificationsEnabled ?? true,
            createdAt: data.createdAt?.toDate() || new Date(),
          } as User;
        });

        return users;
      } catch (error) {
        console.warn("Error fetching users:", error);
      }
      return [];
    },
  });
};

// Fetch single user by ID
export const useUser = (userId: string) => {
  return useQuery<User | null, Error>({
    queryKey: userKeys.detail(userId),
    queryFn: async () => {
      if (!userId) return null;

      try {
        const userRef = doc(db, "users", userId);
        const snapshot = await getDoc(userRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          const email = data.email || "";
          const name = data.name || "";
          // Use displayName, name, or email prefix as fallback
          const displayName =
            data.displayName || name || (email ? email.split("@")[0] : "");
          return {
            uid: snapshot.id,
            email,
            name,
            displayName,
            roles: data.roles || [],
            role: data.role || null,
            activeRole: data.activeRole || null,
            status: data.status || "ACTIVE",
            phone: data.phone || "",
            region: data.region || "",
            city: data.city || "",
            district: data.district || "",
            notificationsEnabled: data.notificationsEnabled ?? true,
            createdAt: data.createdAt?.toDate() || new Date(),
            lastLoginAt: data.lastLoginAt?.toDate() || undefined,
          } as User;
        }
      } catch (error) {
        console.warn("Error fetching user:", error);
      }

      return null;
    },
    enabled: !!userId,
  });
};

// Update user status
export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      status,
    }: {
      userId: string;
      status: UserStatus;
    }) => {
      // Update real Firestore document
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
    },
  });
};

// Change which role(s) a user holds (admin-only action — firestore.rules
// blocks a user from ever granting themselves ADMIN, but an existing admin
// may set anyone else's roles here). A user can hold more than one role at
// once (e.g. CLIENT + PROVIDER); activeRole must be one of the granted
// roles, and the legacy singular `role` field is kept in sync for
// firestore.rules' role() fallback.
export const useUpdateUserRoles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      roles,
      activeRole,
    }: {
      userId: string;
      roles: UserRole[];
      activeRole: UserRole;
    }) => {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { roles, activeRole, role: activeRole });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
    },
  });
};

// Admin edits a user's basic profile fields (Firestore only — email/password
// live in Firebase Auth and aren't touched here).
export const useAdminUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: Partial<Pick<User, "name" | "phone" | "region" | "city" | "district">>;
    }) => {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
    },
  });
};

// Permanently deletes a user (Auth account + Firestore docs) via the
// adminDeleteUser Cloud Function — a client SDK can never delete another
// user's Auth account, only the Admin SDK can.
export const useDeleteUserAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const call = httpsCallable(functions, "adminDeleteUser");
      await call({ uid: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};

// Counts for the user-details panel: bookings as client, bookings as
// provider, and reports filed against this account. Uses count() aggregation
// queries so it never reads full documents — cheap enough to run on demand
// when the details dialog opens (not in the main list).
export const useUserActivityCounts = (userId: string) => {
  return useQuery({
    queryKey: ["users", "activity-counts", userId],
    queryFn: async () => {
      const [clientBookings, providerBookings, reports] = await Promise.all([
        getCountFromServer(
          query(collection(db, "bookings"), where("clientId", "==", userId)),
        ),
        getCountFromServer(
          query(collection(db, "bookings"), where("providerId", "==", userId)),
        ),
        getCountFromServer(
          query(collection(db, "reports"), where("targetOwnerId", "==", userId)),
        ),
      ]);

      return {
        bookingCount: clientBookings.data().count + providerBookings.data().count,
        reportCount: reports.data().count,
      };
    },
    enabled: !!userId,
  });
};

// The signed-in account's own recent sign-in history (see AdminAccountPage's
// security section).
export const useLoginHistory = (userId: string) => {
  return useQuery({
    queryKey: ["users", "loginHistory", userId],
    queryFn: () => getLoginHistory(userId),
    enabled: !!userId,
  });
};
