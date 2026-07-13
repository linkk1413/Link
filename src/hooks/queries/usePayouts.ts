// React Query hooks for Payouts (Admin)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Payout, PayoutStatus } from "@/types";

// Extended payout with the provider's name and the bank details the admin needs
// to actually make the transfer.
export interface PayoutWithProvider extends Payout {
  providerName?: string;
  providerEmail?: string;
  providerPhone?: string;
  processedAt?: Date;
  bankAccountHolder?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIBAN?: string;
}

// Query keys
export const payoutKeys = {
  all: ["payouts"] as const,
  byStatus: (status: PayoutStatus) => ["payouts", status] as const,
};

// Fetch all payouts
export const usePayouts = () => {
  return useQuery<PayoutWithProvider[], Error>({
    queryKey: payoutKeys.all,
    queryFn: async () => {
      try {
        const payoutsRef = collection(db, "payouts");
        const q = query(payoutsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        const payouts: PayoutWithProvider[] = await Promise.all(
          snapshot.docs.map(async (payoutDoc) => {
            const data = payoutDoc.data();

            // The name lives on the user doc; the bank details live on the
            // provider doc — the admin needs both to process the transfer.
            let providerName = "Provider";
            let providerEmail: string | undefined;
            let providerPhone: string | undefined;
            let bank: Record<string, string | undefined> = {};

            if (data.providerId) {
              try {
                const [userDoc, providerDoc] = await Promise.all([
                  getDoc(doc(db, "users", data.providerId)),
                  getDoc(doc(db, "providers", data.providerId)),
                ]);

                if (userDoc.exists()) {
                  const u = userDoc.data();
                  providerName = u.name || u.displayName || providerName;
                  providerEmail = u.email;
                  providerPhone = u.phone;
                }

                if (providerDoc.exists()) {
                  const p = providerDoc.data();
                  if (providerName === "Provider") {
                    providerName = p.name || p.displayName || "Provider";
                  }
                  providerPhone = providerPhone || p.phone;
                  bank = {
                    bankAccountHolder: p.bankAccountHolder,
                    bankName: p.bankName,
                    bankAccountNumber: p.bankAccountNumber,
                    bankIBAN: p.bankIBAN,
                  };
                }
              } catch (error) {
                console.warn(
                  `Error fetching provider ${data.providerId}:`,
                  error,
                );
              }
            }

            return {
              id: payoutDoc.id,
              providerId: data.providerId || "",
              providerName,
              providerEmail,
              providerPhone,
              amount: data.amount || 0,
              status: data.status || "REQUESTED",
              createdAt: data.createdAt?.toDate() || new Date(),
              processedAt: data.processedAt?.toDate(),
              ...bank,
            };
          }),
        );

        return payouts;
      } catch (error) {
        console.warn("Error fetching payouts:", error);
      }
      return [];
    },
  });
};

// Process payout (approve, reject, mark paid)
export const useProcessPayout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payoutId,
      status,
      reason,
    }: {
      payoutId: string;
      status: PayoutStatus;
      reason?: string;
    }) => {
      // Update real Firestore document
      const payoutRef = doc(db, "payouts", payoutId);
      await updateDoc(payoutRef, {
        status,
        rejectionReason: reason || null,
        processedAt: status === "PAID" ? serverTimestamp() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payoutKeys.all });
    },
  });
};
