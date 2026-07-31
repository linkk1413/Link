// React Query hooks for Provider Identity Verifications
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  VerificationRequest,
  getLatestVerificationForProvider,
  submitVerificationRequest,
} from "@/lib/firestore";

// Query keys
export const verificationKeys = {
  all: ["verifications"] as const,
  pending: ["verifications", "pending"] as const,
  provider: (providerId: string) =>
    ["verifications", "provider", providerId] as const,
};

// Count of PENDING requests — same `verifications` collection the admin
// verifications page manages, so this always matches what that page shows.
export const usePendingVerifications = () => {
  return useQuery<VerificationRequest[], Error>({
    queryKey: verificationKeys.pending,
    queryFn: async () => {
      const verificationsRef = collection(db, "verifications");
      const q = query(verificationsRef, where("status", "==", "PENDING"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          submittedAt: data.submittedAt?.toDate?.() || new Date(),
        } as VerificationRequest;
      });
    },
  });
};

// The signed-in provider's own latest verification request (for the
// "Identity Verification" card on their profile page).
export const useProviderVerification = (providerId: string) => {
  return useQuery<VerificationRequest | null, Error>({
    queryKey: verificationKeys.provider(providerId),
    queryFn: () => getLatestVerificationForProvider(providerId),
    enabled: !!providerId,
  });
};

export const useSubmitVerification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      providerId,
      providerName,
      providerEmail,
      documents,
    }: {
      providerId: string;
      providerName: string;
      providerEmail: string;
      documents: { name: string; url: string }[];
    }) =>
      submitVerificationRequest(
        providerId,
        providerName,
        providerEmail,
        documents,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: verificationKeys.provider(variables.providerId),
      });
      queryClient.invalidateQueries({ queryKey: verificationKeys.pending });
    },
  });
};
