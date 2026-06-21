import { Redirect } from 'expo-router';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { isAuthenticated, isLoading, requiresPasswordLogin } = useAuth();
  if (isLoading) return <LoadingOverlay />;
  if (!isAuthenticated || requiresPasswordLogin) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)/home" />;
}
