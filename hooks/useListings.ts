import { useInfiniteQuery } from '@tanstack/react-query';
import { listingsApi } from '@/lib/api-config';

const PAGE_SIZE = 10;

export function useListings(token?: string | null, role?: string | null) {
  return useInfiniteQuery({
    queryKey: ['listings', token ?? 'guest', role ?? 'guest'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = token
        ? await listingsApi.search(token, {
            page: pageParam,
            limit: PAGE_SIZE,
            ...(role !== 'landlord' ? { status: 'available' } : {})
          })
        : await listingsApi.browse();
      if (!response.success) {
        throw new Error(response.error?.message ?? 'Unable to load listings');
      }
      return response.data ?? [];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined,
    initialPageParam: 1
  });
}
