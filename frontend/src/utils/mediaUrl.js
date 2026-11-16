/**
 * @file mediaUrl.js
 * @description Media URL Resolver. Normalizes and constructs absolute URLs for course thumbnails, profile avatars, banners, and local asset fallbacks.
 */

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

  const trimmed = url.trim();

  // Already a complete HTTP/HTTPS URL or Data URI or Blob
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Frontend static assets (e.g. /assets/foo.png or assets/foo.png)
  if (trimmed.startsWith('/assets/') || trimmed.startsWith('assets/')) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  // Frontend static sample presets (e.g. /sample-presets/p1.jpg)
  if (trimmed.startsWith('/sample-presets/') || trimmed.startsWith('sample-presets/') || trimmed.includes('sample-presets/')) {
    const filename = trimmed.split('sample-presets/').pop();
    return `/sample-presets/${filename}`;
  }

  const backendBase = getBackendBaseUrl();

  // If already prefixed with /media/ or /api/files/
  if (trimmed.startsWith('/media/') || trimmed.startsWith('/api/files/')) {
    return `${backendBase}${trimmed}`;
  }

  // Legacy fallback: If prefixed with /uploads/
  if (trimmed.includes('/uploads/')) {
    const filename = trimmed.split('/uploads/').pop();
    return `${backendBase}/uploads/${filename}`;
  }

  // Plain filename or relative path
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // Automatically prefix plain image filenames (e.g., profile-xxx.png or banner-xxx.jpg)
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('profile-') || lower.startsWith('avatar-') || lower.startsWith('cover-')) {
    return `${backendBase}/media/profiles/${trimmed.replace(/^\/+/, '')}`;
  }
  if (lower.startsWith('banner-') || lower.startsWith('cardimage-') || lower.startsWith('course-')) {
    return `${backendBase}/media/courses/${trimmed.replace(/^\/+/, '')}`;
  }

  return `${backendBase}${cleanPath}`;
}

export default getMediaUrl;
