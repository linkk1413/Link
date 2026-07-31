// React Query hooks for Users (Admin)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
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
            role: data.role || null,
            status: data.status || "ACTIVE",
            phone: data.phone || "",
            region: data.region || "",
            city: data.city || "",
            district: data.district || "",
            notificationsEnabled: data.notificationsEnabled ?? true,
            createdAt: data.createdAt?.toDate() || new Date(),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};

// Change a user's role (admin-only action — firestore.rules blocks a user
// from ever granting themselves ADMIN, but an existing admin may set anyone
// else's role here).
export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: UserRole;
    }) => {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { role, activeRole: role, roles: [role] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};
