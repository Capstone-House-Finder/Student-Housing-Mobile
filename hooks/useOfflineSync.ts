import { useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { listingsApi, reportsApi, reviewsApi } from '@/lib/api-config';
import { processMutationQueue as drainQueue } from '@/lib/offline-queue';

export function useOfflineSync() {
  const [isOffline, setIsOffline] = useState(false);
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

  const replayQueue = useCallback(async () => {
    if (!accessToken) return;
    await drainQueue(accessToken, {
      review: async (listingId, data) => {
        const res = await reviewsApi.create(accessToken, listingId, data);
        return res.success;
      },
      contact: async (listingId) => {
        const res = await listingsApi.contact(accessToken, listingId);
        return res.success;
      },
      report: async (data) => {
        const res = await reportsApi.submit(accessToken, data);
        return res.success;
      },
      listingCreate: async (payload) => {
        const res = await listingsApi.create(accessToken, payload);
        return res.success;
      }
    });
    queryClient.invalidateQueries();
  }, [accessToken, queryClient]);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false;
      setIsOffline(offline);
      if (!offline && accessToken) {
        replayQueue();
        queryClient.invalidateQueries();
      }
    });
  }, [accessToken, queryClient, replayQueue]);

  return { isOffline, replayQueue };
}
