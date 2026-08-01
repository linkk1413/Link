// React Query hooks for a client's saved (favorite) providers
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addFavorite,
  removeFavorite,
  getFavorites,
  isProviderFavorited,
} from "@/lib/firestore";
import { Favorite } from "@/types";

export const favoriteKeys = {
  byClient: (clientId: string) => ["favorites", "client", clientId] as const,
  isFavorited: (clientId: string, providerId: string) =>
    ["favorites", "isFavorited", clientId, providerId] as const,
};

export const useFavorites = (clientId: string) => {
  return useQuery<Favorite[], Error>({
    queryKey: favoriteKeys.byClient(clientId),
    queryFn: () => getFavorites(clientId),
    enabled: !!clientId,
  });
};

export const useIsFavorited = (clientId: string, providerId: string) => {
  return useQuery<boolean, Error>({
    queryKey: favoriteKeys.isFavorited(clientId, providerId),
    queryFn: () => isProviderFavorited(clientId, providerId),
    enabled: !!clientId && !!providerId,
  });
};

export const useAddFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientId,
      providerId,
      providerName,
    }: {
      clientId: string;
      providerId: string;
      providerName?: string;
    }) => addFavorite(clientId, providerId, providerName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.byClient(variables.clientId) });
      queryClient.invalidateQueries({
        queryKey: favoriteKeys.isFavorited(variables.clientId, variables.providerId),
      });
    },
  });
};

export const useRemoveFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, providerId }: { clientId: string; providerId: string }) =>
      removeFavorite(clientId, providerId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.byClient(variables.clientId) });
      queryClient.invalidateQueries({
        queryKey: favoriteKeys.isFavorited(variables.clientId, variables.providerId),
      });
    },
  });
};
