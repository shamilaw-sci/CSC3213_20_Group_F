import { getBackendBaseUrl } from './api';

/**
 * Resolves full URL for public assets (course banners/thumbnails, profile photos, covers, etc.)
 * 
 * @param {string} url - Raw URL or filename stored in database
 * @param {string} fallback - Fallback URL/image if url is empty
 * @returns {string}
 */
export function getMediaUrl(url, fallback = '') {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }

  // Already a complete HTTP/HTTPS URL or Data URI or Blob
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const backendBase = getBackendBaseUrl();

  // If already prefixed with /media/ or /api/files/
  if (url.startsWith('/media/') || url.startsWith('/api/files/')) {
    return `${backendBase}${url}`;
  }

  // Legacy fallback: If prefixed with /uploads/
  if (url.includes('/uploads/')) {
    const filename = url.split('/uploads/').pop();
    return `${backendBase}/uploads/${filename}`;
  }

  // Relative path or plain filename
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${backendBase}${cleanPath}`;
}

export default getMediaUrl;
