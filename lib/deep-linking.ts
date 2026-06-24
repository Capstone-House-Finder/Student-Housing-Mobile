import * as Linking from 'expo-linking';

export interface ParsedDeepLink {
  route: 'listing' | 'landlord-dashboard' | 'profile' | 'reset-password' | 'verify-email';
  listingId?: string;
  token?: string;
}

export function parseDeepLink(url: string): ParsedDeepLink | null {
  const parsed = Linking.parse(url);
  const path = (parsed.path ?? '').replace(/^\//, '');
  const hostname = parsed.hostname ?? '';

  if (path.startsWith('listing/') || hostname === 'listing') {
    const id = path.replace('listing/', '').split('/')[0];
    if (id) return { route: 'listing', listingId: String(id) };
  }

  if (path === 'landlord/dashboard' || path.startsWith('landlord/dashboard')) {
    return { route: 'landlord-dashboard' };
  }

  if (path === 'profile') {
    return { route: 'profile' };
  }

  if (path === 'reset-password' || path.includes('reset-password')) {
    const token = typeof parsed.queryParams?.token === 'string'
      ? parsed.queryParams.token
      : typeof parsed.queryParams?.resetToken === 'string'
        ? parsed.queryParams.resetToken
        : undefined;
    if (token) return { route: 'reset-password', token };
  }

  if (path === 'verify-email' || path.includes('verify-email')) {
    const token = typeof parsed.queryParams?.token === 'string'
      ? parsed.queryParams.token
      : undefined;
    if (token) return { route: 'verify-email', token };
  }

  return null;
}

export function getListingShareUrl(listingId: number) {
  return `https://housefinder.com/listing/${listingId}`;
}
