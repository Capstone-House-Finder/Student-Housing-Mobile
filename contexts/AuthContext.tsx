import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DeviceEventEmitter } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { secureStorage } from '@/lib/storage';
import { apiRequest, authApi, type RegisterInput, type User } from '@/lib/api-config';

const TOKEN_REFRESHED_EVENT = 'access_token_refreshed';
import { unregisterPushNotifications } from '@/services/notifications';

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** True when the authenticated user has not yet verified their email */
  isEmailUnverified: boolean;
  biometricsEnabled: boolean;
  requiresPasswordLogin: boolean;
  biometricHardwareAvailable: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; errorCode?: string; user?: User }>;
  /** Returns pendingVerification:true when registration succeeded but email is unverified */
  register: (data: RegisterInput) => Promise<{ success: boolean; error?: string; user?: User; pendingVerification?: boolean }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
  setBiometrics: (enabled: boolean) => Promise<void>;
}

interface TokenPayload {
  user: User;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
}

const ACCESS_TOKEN_KEY = 'housing_access_token';
const REFRESH_TOKEN_KEY = 'housing_refresh_token';
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [requiresPasswordLogin, setRequiresPasswordLogin] = useState(false);
  const [biometricHardwareAvailable, setBiometricHardwareAvailable] = useState(false);

  const logout = useCallback(async () => {
    if (accessToken) {
      await unregisterPushNotifications(accessToken).catch(() => undefined);
    }
    await secureStorage.removeToken(ACCESS_TOKEN_KEY);
    await secureStorage.removeToken(REFRESH_TOKEN_KEY);
    setAccessToken(null);
    setUser(null);
    setRequiresPasswordLogin(false);
  }, [accessToken]);

  useEffect(() => {
    const logoutSubscription = DeviceEventEmitter.addListener('force_logout', () => {
      logout();
    });
    const tokenRefreshSubscription = DeviceEventEmitter.addListener(TOKEN_REFRESHED_EVENT, (token: string) => {
      setAccessToken(token);
      setRequiresPasswordLogin(false);
    });

    return () => {
      logoutSubscription.remove();
      tokenRefreshSubscription.remove();
    };
  }, [logout]);

  const refreshSession = useCallback(async () => {
    const refreshToken = await secureStorage.getToken(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return false;
    }

    const response = await apiRequest<TokenPayload>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken }
    });

    if (!response.success || !response.data) {
      await logout();
      return false;
    }

    const nextAccessToken = response.data.accessToken ?? response.data.token;
    if (!nextAccessToken) {
      await logout();
      return false;
    }

    await secureStorage.setToken(ACCESS_TOKEN_KEY, nextAccessToken);
    if (response.data.refreshToken) {
      await secureStorage.setToken(REFRESH_TOKEN_KEY, response.data.refreshToken);
    }

    setAccessToken(nextAccessToken);
    setRequiresPasswordLogin(false);
    if (response.data.user) {
      setUser(response.data.user);
    }
    return true;
  }, [logout]);

  const refreshUser = useCallback(async () => {
    const token = accessToken ?? await secureStorage.getToken(ACCESS_TOKEN_KEY);
    if (!token) return;
    const response = await authApi.getMe(token);
    if (response.success && response.data) {
      const data = response.data as { user: User };
      setUser(data.user);
      setAccessToken(token);
    }
  }, [accessToken]);

  const loadCurrentUser = useCallback(async (token: string) => {
    const response = await authApi.getMe(token);
    if (response.success && response.data) {
      const data = response.data as { user: User };
      setUser(data.user);
      setAccessToken(token);
      setRequiresPasswordLogin(false);
      return true;
    }

    if (await refreshSession()) {
      return true;
    }

    await logout();
    return false;
  }, [refreshSession, logout]);

  const authInitializedRef = useRef(false);
  const biometricAuthAttemptedRef = useRef(false);

  useEffect(() => {
    if (authInitializedRef.current) {
      return;
    }
    authInitializedRef.current = true;

    const init = async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricHardwareAvailable(compatible && enrolled);

      const savedToken = await secureStorage.getToken(ACCESS_TOKEN_KEY);
      const refreshToken = await secureStorage.getToken(REFRESH_TOKEN_KEY);
      const isBiometricsPrefEnabled = await secureStorage.getBiometricPreference();
      setBiometricsEnabled(isBiometricsPrefEnabled);

      if (savedToken || refreshToken) {
        if (isBiometricsPrefEnabled && compatible && enrolled && !biometricAuthAttemptedRef.current) {
          biometricAuthAttemptedRef.current = true;
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock Housing App',
            fallbackLabel: 'Use passcode',
            disableDeviceFallback: false
          });
          if (!result.success) {
            setRequiresPasswordLogin(true);
            setIsLoading(false);
            return;
          }
          const refreshed = await refreshSession();
          if (!refreshed && savedToken) {
            await loadCurrentUser(savedToken);
          }
        } else if (savedToken) {
          await loadCurrentUser(savedToken);
        } else {
          await refreshSession();
        }
      }
      setIsLoading(false);
    };
    init();
  }, [loadCurrentUser, refreshSession]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    if (response.success && response.data) {
      const data = response.data as TokenPayload;
      const token = data.accessToken ?? data.token;
      if (token) {
        await secureStorage.setToken(ACCESS_TOKEN_KEY, token);
        if (data.refreshToken) {
          await secureStorage.setToken(REFRESH_TOKEN_KEY, data.refreshToken);
        }
        setAccessToken(token);
        setUser(data.user);
        setRequiresPasswordLogin(false);
        return { success: true, user: data.user };
      }
    }
    return { success: false, error: response.error?.message ?? 'Login failed', errorCode: response.error?.code };
  }, []);

  const register = useCallback(async (data: RegisterInput) => {
    const response = await authApi.register(data);
    if (response.success) {
      const payload = response.data as (TokenPayload & { status?: string }) | undefined;
      // New flow: registration succeeded but email verification is required
      if (payload?.status === 'pending_verification' || !payload?.accessToken && !payload?.token) {
        return { success: true, pendingVerification: true };
      }
      const token = payload?.accessToken ?? payload?.token;
      if (token) {
        await secureStorage.setToken(ACCESS_TOKEN_KEY, token);
        if (payload?.refreshToken) {
          await secureStorage.setToken(REFRESH_TOKEN_KEY, payload.refreshToken);
        }
        setAccessToken(token);
        if (payload?.user) setUser(payload.user);
        setRequiresPasswordLogin(false);
        return { success: true, user: payload?.user };
      }
    }
    return { success: false, error: response.error?.message ?? 'Registration failed' };
  }, []);

  const setBiometrics = useCallback(async (enabled: boolean) => {
    await secureStorage.setBiometricPreference(enabled);
    setBiometricsEnabled(enabled);
  }, []);

  const value = useMemo(() => ({
    user,
    accessToken,
    isLoading,
    isAuthenticated: Boolean(user && accessToken && !requiresPasswordLogin),
    isEmailUnverified: Boolean(user && accessToken && !requiresPasswordLogin && (user as User & { email_verified?: boolean }).email_verified === false),
    biometricsEnabled,
    requiresPasswordLogin,
    biometricHardwareAvailable,
    login,
    register,
    logout,
    refreshSession,
    refreshUser,
    setBiometrics
  }), [
    accessToken,
    isLoading,
    biometricsEnabled,
    requiresPasswordLogin,
    biometricHardwareAvailable,
    login,
    logout,
    refreshSession,
    refreshUser,
    register,
    user,
    setBiometrics
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
