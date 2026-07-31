// React Query hooks for Chats and Messages
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Chat, Message } from "@/types";
import { detectContactInfo } from "@/lib/contactInfoFilter";
import { useEffect, useState } from "react";

// Helper to fetch provider name
const getProviderName = async (providerId: string): Promise<string> => {
  try {
    const providerRef = doc(db, "providers", providerId);
    const providerSnap = await getDoc(providerRef);
    if (providerSnap.exists()) {
      return providerSnap.data().displayName || "";
    }
    // Fallback to users collection
    const userRef = doc(db, "users", providerId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      return data.displayName || data.name || "";
    }
  } catch (error) {
    console.warn("Error fetching provider name:", error);
  }
  return "";
};

// Query keys for cache management
export const chatKeys = {
  all: ["chats"] as const,
  byClient: (clientId: string) => ["chats", "client", clientId] as const,
  byProvider: (providerId: string) =>
    ["chats", "provider", providerId] as const,
  detail: (id: string) => ["chats", id] as const,
  messages: (chatId: string) => ["chats", chatId, "messages"] as const,
};

// Helper to convert Firestore timestamps
const convertTimestamp = (timestamp: unknown): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if ((timestamp as { toDate?: () => Date })?.toDate) {
    return (timestamp as { toDate: () => Date }).toDate();
  }
  return new Date(timestamp as string | number | Date);
};

// Fetch chats for a client
export const useClientChats = (clientId: string) => {
  return useQuery<Chat[], Error>({
    queryKey: chatKeys.byClient(clientId),
    queryFn: async () => {
      const chatsRef = collection(db, "chats");
      // Simple query without orderBy to avoid needing composite index
      const q = query(chatsRef, where("clientId", "==", clientId));
      const snapshot = await getDocs(q);
      const chats = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          // Fetch provider name if not stored in chat
          let providerName = data.providerName || "";
          if (!providerName && data.providerId) {
            providerName = await getProviderName(data.providerId);
          }
          return {
            id: docSnap.id,
            ...data,
            providerName,
            createdAt: convertTimestamp(data.createdAt),
            lastMessageAt: data.lastMessageAt
              ? convertTimestamp(data.lastMessageAt)
              : undefined,
          } as Chat;
        }),
      );
      // Sort client-side
      return chats.sort((a, b) => {
        const aTime = a.lastMessageAt?.getTime() || a.createdAt.getTime();
        const bTime = b.lastMessageAt?.getTime() || b.createdAt.getTime();
        return bTime - aTime;
      });
    },
    enabled: !!clientId,
    refetchOnMount: "always",
  });
};

// Fetch chats for a provider
export const useProviderChats = (providerId: string) => {
  return useQuery<Chat[], Error>({
    queryKey: chatKeys.byProvider(providerId),
    queryFn: async () => {
      const chatsRef = collection(db, "chats");
      // Simple query without orderBy to avoid needing composite index
      const q = query(chatsRef, where("providerId", "==", providerId));
      const snapshot = await getDocs(q);
      const chats = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          // Use stored clientName from chat document (avoids permission issues)
          clientName: data.clientName || "",
          createdAt: convertTimestamp(data.createdAt),
          lastMessageAt: data.lastMessageAt
            ? convertTimestamp(data.lastMessageAt)
            : undefined,
        } as Chat;
      });
      // Sort client-side
      return chats.sort((a, b) => {
        const aTime = a.lastMessageAt?.getTime() || a.createdAt.getTime();
        const bTime = b.lastMessageAt?.getTime() || b.createdAt.getTime();
        return bTime - aTime;
      });
    },
    enabled: !!providerId,
    refetchOnMount: "always",
  });
};

// Fetch a single chat by ID
export const useChat = (chatId: string) => {
  return useQuery<Chat | null, Error>({
    queryKey: chatKeys.detail(chatId),
    queryFn: async () => {
      const chatRef = doc(db, "chats", chatId);
      const snapshot = await getDoc(chatRef);
      if (!snapshot.exists()) return null;
      const data = snapshot.data();
      return {
        id: snapshot.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        lastMessageAt: data.lastMessageAt
          ? convertTimestamp(data.lastMessageAt)
          : undefined,
      } as Chat;
    },
    enabled: !!chatId,
  });
};

// Real-time chat messages hook
export const useChatMessages = (chatId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newMessages = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: convertTimestamp(data.createdAt),
          } as Message;
        });
        setMessages(newMessages);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching messages:", err);
        setError(err as Error);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [chatId]);

  return { data: messages, isLoading, error };
};

// Send a message
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chatId,
      senderId,
      text,
      imageUrl,
    }: {
      chatId: string;
      senderId: string;
      text?: string;
      imageUrl?: string;
    }) => {
      const messagesRef = collection(db, "chats", chatId, "messages");
      const contactMatch = text ? detectContactInfo(text) : null;
      const message = {
        senderId,
        text: text || "",
        type: imageUrl ? "IMAGE" : "TEXT",
        imageUrl: imageUrl || null,
        createdAt: serverTimestamp(),
        ...(contactMatch
          ? { flaggedContactInfo: true, flaggedMatch: contactMatch }
          : {}),
      };

      // Add the message
      const docRef = await addDoc(messagesRef, message);

      // Update the chat's last message
      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, {
        lastMessage: text || "📷 Image",
        lastMessageAt: serverTimestamp(),
      });

      return docRef.id;
    },
    onSuccess: (_, variables) => {
      // The real-time listener will update messages automatically
      // Just invalidate the chat list to update last message
      queryClient.invalidateQueries({ queryKey: chatKeys.all });
    },
  });
};

// Create a new chat (or get existing one)
export const useCreateChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      providerId,
      clientName,
      providerName,
      bookingId,
    }: {
      clientId: string;
      providerId: string;
      clientName?: string;
      providerName?: string;
      bookingId?: string;
    }) => {
      // Check if chat already exists between these users
      const chatsRef = collection(db, "chats");
      const q = query(
        chatsRef,
        where("clientId", "==", clientId),
        where("providerId", "==", providerId),
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }

      // Create new chat
      const newChat = {
        clientId,
        providerId,
        clientName: clientName || "",
        providerName: providerName || "",
        bookingId: bookingId || null,
        lastMessage: "",
        lastMessageAt: null,
        unreadCount: 0,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(chatsRef, newChat);
      return docRef.id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.byClient(variables.clientId),
      });
      queryClient.invalidateQueries({
        queryKey: chatKeys.byProvider(variables.providerId),
      });
    },
  });
};

// Admin: every chat in the platform (firestore.rules grants isAdmin() a
// blanket read on /chats, no query filter needed).
export const useAllChats = () => {
  return useQuery<Chat[], Error>({
    queryKey: chatKeys.all,
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "chats"));
      const chats = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          lastMessageAt: data.lastMessageAt
            ? convertTimestamp(data.lastMessageAt)
            : undefined,
        } as Chat;
      });
      return chats.sort((a, b) => {
        const aTime = a.lastMessageAt?.getTime() || a.createdAt.getTime();
        const bTime = b.lastMessageAt?.getTime() || b.createdAt.getTime();
        return bTime - aTime;
      });
    },
  });
};

// Admin: delete a single message (moderation). firestore.rules only allows
// this for isAdmin().
export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chatId,
      messageId,
    }: {
      chatId: string;
      messageId: string;
    }) => {
      await deleteDoc(doc(db, "chats", chatId, "messages", messageId));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.messages(variables.chatId),
      });
    },
  });
};
