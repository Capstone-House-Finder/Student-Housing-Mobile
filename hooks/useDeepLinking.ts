import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuth } from '@/contexts/AuthContext';
import { parseDeepLink } from '@/lib/deep-linking';

function navigateDeepLink(link: ReturnType<typeof parseDeepLink>, isAuthenticated: boolean) {
  if (!link) return;

  if (!isAuthenticated && link.route !== 'reset-password' && link.route !== 'verify-email') {
    return;
  }

  switch (link.route) {
    case 'listing':
      if (link.listingId) router.push(`/listing/${link.listingId}`);
      break;
    case 'landlord-dashboard':
      router.push('/(tabs)/dashboard');
      break;
    case 'profile':
      router.push('/(tabs)/profile');
      break;
    case 'reset-password':
      router.push({
        pathname: '/(auth)/reset-password',
        params: { token: link.token ?? '' }
      });
      break;
    case 'verify-email':
      router.push({
        pathname: '/(auth)/verify-email',
        params: { token: link.token ?? '' }
      });
      break;
  }
}

export function useDeepLinking() {
  const { isAuthenticated, isLoading } = useAuth();
  const pendingUrl = Linking.useURL();

  useEffect(() => {
    if (isLoading) return;

    const handleUrl = (url: string | null) => {
      if (!url) return;
      const parsed = parseDeepLink(url);
      navigateDeepLink(parsed, isAuthenticated);
    };

    handleUrl(pendingUrl);

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    Linking.getInitialURL().then(handleUrl);

    return () => sub.remove();
  }, [isAuthenticated, isLoading, pendingUrl]);
}
