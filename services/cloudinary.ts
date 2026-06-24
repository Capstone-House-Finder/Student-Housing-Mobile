import Constants from 'expo-constants';

// Base URL for backend API (from app config)
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

export interface UploadResult {
  url: string;
  public_id: string;
  width: number;
  height: number;
}

/**
 * Upload a single image to the backend which proxies to Cloudinary.
 * Returns the same UploadResult shape as before.
 */
export async function uploadImageToCloudinary(
  localUri: string,
  listingId: string,
  authToken: string
): Promise<UploadResult> {
  const filename = localUri.split('/').pop() ?? 'photo.jpg';
  const formData = new FormData();
  formData.append('photos', { uri: localUri, name: filename, type: 'image/jpeg' } as any);

  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/listings/${listingId}/photos`);
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          // Backend returns { success, data: { photos: [{ url, public_id, ... }] } }
          let url = response.secure_url ?? response.url;
          let publicId = response.public_id;
          // Fallback to nested structure if top‑level fields are missing
          if (!url && response.success && response.data?.photos?.[0]) {
            url = response.data.photos[0].url;
            publicId = response.data.photos[0].public_id;
          }
          if (!url) {
            reject(new Error('Upload failed: no url in response'));
          } else {
            resolve({
              url,
              public_id: publicId,
              width: response.width,
              height: response.height,
            });
          }
        } catch (e) {
          reject(new Error(`Failed to parse upload response: ${xhr.responseText}`));
        }
      } else {
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.send(formData);
  });
}

/**
 * Upload multiple images.
 */
export async function uploadMultipleImages(
  localUris: string[],
  listingId: string,
  authToken: string
): Promise<UploadResult[]> {
  const results = await Promise.allSettled(
    localUris.map((uri) => uploadImageToCloudinary(uri, listingId, authToken))
  );

  const succeeded = results
    .filter((r): r is PromiseFulfilledResult<UploadResult> => r.status === 'fulfilled')
    .map((r) => r.value);

  if (succeeded.length === 0) {
    const firstFailure = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    throw new Error(firstFailure?.reason?.message ?? 'All uploads failed');
  }

  return succeeded;
}
