/**
 * Resolves full URL for public assets (courses banners/thumbnails, profile photos, covers)
 * 
 * @param {string} url - Raw URL or filename stored in database
 * @param {string} fallback - Fallback URL/image if url is empty
 * @returns {string}
 */
export function getMediaUrl(url, fallback = '') {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }

  // Already a complete HTTP/HTTPS URL or Data URI
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

  // If already prefixed with /media/
  if (url.startsWith('/media/')) {
    return `${backendBase}${url}`;
  }

  // If prefixed with /uploads/
  if (url.includes('/uploads/')) {
    const filename = url.split('/uploads/').pop();
    return `${backendBase}/uploads/${filename}`;
  }

  // Relative path or plain filename
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${backendBase}${cleanPath}`;
}

export default getMediaUrl;
