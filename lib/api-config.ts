import Constants from 'expo-constants';
import { Platform, DeviceEventEmitter } from 'react-native';
import * as HousingShared from '@capstone-house-finder/shf-api';
import type { ApiResponse, Listing } from '@capstone-house-finder/shf-api';
import { secureStorage } from '@/lib/storage';

const TOKEN_REFRESHED_EVENT = 'access_token_refreshed';
const ACCESS_TOKEN_KEY = 'housing_access_token';
const REFRESH_TOKEN_KEY = 'housing_refresh_token';

let refreshInFlight: Promise<string | null> | null = null;

export async function getValidAccessToken(fallback?: string | null): Promise<string | null> {
  const stored = await secureStorage.getToken(ACCESS_TOKEN_KEY);
  if (!stored && fallback) {
    return fallback;
  }
  if (!stored) {
    return null;
  }
  // Verify token is not expired by checking if it can be decoded
  try {
    const parts = stored.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        // Token is expired, try to refresh
        const refreshed = await refreshAccessToken();
        return refreshed ?? null;
      }
    }
  } catch (e) {
    // If token is malformed, try to refresh
    const refreshed = await refreshAccessToken();
    return refreshed ?? null;
  }
  return stored;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = await secureStorage.getToken(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return null;
    }

    const refreshResponse = await originalFetch(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!refreshResponse.ok) {
      await secureStorage.removeToken(ACCESS_TOKEN_KEY);
      await secureStorage.removeToken(REFRESH_TOKEN_KEY);
      DeviceEventEmitter.emit('force_logout');
      return null;
    }

    const refreshData = await refreshResponse.json();
    const newAccessToken = refreshData.data?.accessToken || refreshData.data?.token;

    if (!newAccessToken) {
      await secureStorage.removeToken(ACCESS_TOKEN_KEY);
      await secureStorage.removeToken(REFRESH_TOKEN_KEY);
      DeviceEventEmitter.emit('force_logout');
      return null;
    }

    await secureStorage.setToken(ACCESS_TOKEN_KEY, newAccessToken);
    if (refreshData.data?.refreshToken) {
      await secureStorage.setToken(REFRESH_TOKEN_KEY, refreshData.data.refreshToken);
    }
    DeviceEventEmitter.emit(TOKEN_REFRESHED_EVENT, newAccessToken);
    return newAccessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

interface ListingCollectionResponse {
  listings?: Listing[];
}

interface LandlordDashboardResponse {
  listings?: Listing[];
  stats?: Record<string, unknown>;
}

const configuredApiUrl = Constants.expoConfig?.extra?.apiUrl;
const localApiUrl = Platform.OS === 'android'
  ? 'https://afflicted-grandson-cake.ngrok-free.dev'
  : 'http://localhost:5000';
const apiUrl = (typeof configuredApiUrl === 'string' && configuredApiUrl.trim()
  ? configuredApiUrl
  : localApiUrl
).replace(/\/$/, '');

HousingShared.configureApi?.(apiUrl);

// Global fetch interceptor for 401 token refresh
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let response = await originalFetch(input, init);
  
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : (input as Request).url || input.toString();

  const isBackendRequest = url.startsWith(apiUrl) || url.includes('/api/');
  const isAuthRequest = url.includes('/api/auth/refresh') || url.includes('/api/auth/login');

  if (
    isBackendRequest &&
    !isAuthRequest &&
    (response.status === 401 || response.status === 403)
  ) {
    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      const retryHeaders: Record<string, string> = {};
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((value, key) => {
            retryHeaders[key] = value;
          });
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([key, value]) => {
            retryHeaders[key] = value;
          });
        } else {
          Object.assign(retryHeaders, init.headers);
        }
      }
      retryHeaders['Authorization'] = `Bearer ${newAccessToken}`;
      response = await originalFetch(input, { ...init, headers: retryHeaders });
    }
  }
  
  return response;
};

const sharedListingsApi = HousingShared.listingsApi;

function normalizeListings(data: unknown): Listing[] {
  if (Array.isArray(data)) {
    return data as Listing[];
  }

  const collection = data as ListingCollectionResponse | undefined;
  return collection?.listings ?? [];
}

function withListingsArray(response: ApiResponse<unknown>): ApiResponse<Listing[]> {
  if (!response.success) {
    return response as ApiResponse<Listing[]>;
  }

  return {
    ...response,
    data: normalizeListings(response.data)
  };
}

export const listingsApi = {
  ...sharedListingsApi,
  browse: async () => withListingsArray(await sharedListingsApi.browse()),
  search: async (token: string, params: Record<string, string | number>) =>
    withListingsArray(await sharedListingsApi.search(token, params)),
  getLandlordDashboard: async (token: string): Promise<ApiResponse<LandlordDashboardResponse>> => {
    const response = await sharedListingsApi.getLandlordDashboard(token);
    if (!response.success) {
      return response as ApiResponse<LandlordDashboardResponse>;
    }

    const dashboard = response.data as LandlordDashboardResponse | undefined;
    return {
      ...response,
      data: {
        ...dashboard,
        listings: normalizeListings(dashboard)
      }
    };
  }
};

export const rentalsApi = HousingShared.rentalsApi;

export * from '@capstone-house-finder/shf-api';
export { apiUrl };
