// React Query hooks for User Blocking
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
  isUserBlocked,
} from "@/lib/firestore";
import { BlockedUser } from "@/types";

export const blockKeys = {
  all: (blockerId: string) => ["blockedUsers", blockerId] as const,
  isBlocked: (blockerId: string, blockedUserId: string) =>
    ["blockedUsers", "check", blockerId, blockedUserId] as const,
};

// Fetch all blocked users for the current user
export const useBlockedUsers = (blockerId: string) => {
  return useQuery<BlockedUser[], Error>({
    queryKey: blockKeys.all(blockerId),
    queryFn: () => getBlockedUsers(blockerId),
    enabled: !!blockerId,
  });
};

// Check if a specific user is blocked
export const useIsUserBlocked = (blockerId: string, blockedUserId: string) => {
  return useQuery<boolean, Error>({
    queryKey: blockKeys.isBlocked(blockerId, blockedUserId),
    queryFn: () => isUserBlocked(blockerId, blockedUserId),
    enabled: !!blockerId && !!blockedUserId,
  });
};

// Block a user
export const useBlockUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      blockerId,
      blockedUserId,
    }: {
      blockerId: string;
      blockedUserId: string;
    }) => blockUser(blockerId, blockedUserId),
    onSuccess: (_, { blockerId, blockedUserId }) => {
      queryClient.invalidateQueries({
        queryKey: blockKeys.all(blockerId),
      });
      queryClient.invalidateQueries({
        queryKey: blockKeys.isBlocked(blockerId, blockedUserId),
      });
    },
  });
};

// Unblock a user
export const useUnblockUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      blockerId,
      blockedUserId,
    }: {
      blockerId: string;
      blockedUserId: string;
    }) => unblockUser(blockerId, blockedUserId),
    onSuccess: (_, { blockerId, blockedUserId }) => {
      queryClient.invalidateQueries({
        queryKey: blockKeys.all(blockerId),
      });
      queryClient.invalidateQueries({
        queryKey: blockKeys.isBlocked(blockerId, blockedUserId),
      });
    },
  });
};
