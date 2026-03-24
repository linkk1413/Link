// React Query hooks for Payments
import { useMutation, useQuery } from "@tanstack/react-query";
import { collection, getDocs, orderBy, query, where, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { createPayment, updatePayment, timestampToDate } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { Payment } from "@/types";

export const paymentKeys = {
  all: ["payments"] as const,
  byProvider: (providerId: string) =>
    ["payments", "provider", providerId] as const,
  byClient: (clientId: string) => ["payments", "client", clientId] as const,
};

interface FirestorePayment extends Omit<Payment, "createdAt"> {
  createdAt: { toDate?: () => Date } | null;
}

const mapPayment = (doc: QueryDocumentSnapshot<DocumentData>): Payment => {
  const data = doc.data() as FirestorePayment;
  return {
    ...data,
    id: doc.id,
    createdAt: timestampToDate(data.createdAt || null),
  } as Payment;
};

export const usePayments = () => {
  return useQuery<Payment[], Error>({
    queryKey: paymentKeys.all,
    queryFn: async () => {
      try {
        const paymentsRef = collection(db, "payments");
        const q = query(paymentsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(mapPayment);
      } catch (error) {
        console.warn("Error fetching payments:", error);
        return [];
      }
    },
  });
};

export const usePaymentsByProvider = (providerId: string) => {
  return useQuery<Payment[], Error>({
    queryKey: paymentKeys.byProvider(providerId),
    queryFn: async () => {
      if (!providerId) return [];
      try {
        const paymentsRef = collection(db, "payments");
        try {
          const q = query(
            paymentsRef,
            where("providerId", "==", providerId),
            orderBy("createdAt", "desc"),
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map(mapPayment);
        } catch (indexError) {
          console.warn(
            "Payments provider composite index missing, fetching without order:",
            indexError,
          );
          const fallbackQuery = query(
            paymentsRef,
            where("providerId", "==", providerId),
          );
          const snapshot = await getDocs(fallbackQuery);
          return snapshot.docs.map(mapPayment);
        }
      } catch (error) {
        console.warn("Error fetching provider payments:", error);
        return [];
      }
    },
    enabled: !!providerId,
  });
};

export const usePaymentsByClient = (clientId: string) => {
  return useQuery<Payment[], Error>({
    queryKey: paymentKeys.byClient(clientId),
    queryFn: async () => {
      if (!clientId) return [];
      try {
        const paymentsRef = collection(db, "payments");
        try {
          const q = query(
            paymentsRef,
            where("clientId", "==", clientId),
            orderBy("createdAt", "desc"),
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map(mapPayment);
        } catch (indexError) {
          console.warn(
            "Payments client composite index missing, fetching without order:",
            indexError,
          );
          const fallbackQuery = query(
            paymentsRef,
            where("clientId", "==", clientId),
          );
          const snapshot = await getDocs(fallbackQuery);
          return snapshot.docs.map(mapPayment);
        }
      } catch (error) {
        console.warn("Error fetching client payments:", error);
        return [];
      }
    },
    enabled: !!clientId,
  });
};

export const useCreatePayment = () => {
  return useMutation({
    mutationFn: (payment: Omit<Payment, "id" | "createdAt">) =>
      createPayment(payment),
  });
};

export const useUpdatePayment = () => {
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Payment> }) =>
      updatePayment(id, updates),
  });
};
