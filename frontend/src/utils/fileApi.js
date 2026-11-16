/**
 * @file fileApi.js
 * @description File API Utility. Fetches protected files (lesson PDFs, submissions, assignments) via authorized API requests and manages temporary Blob URLs.
 */

import api from './api';

/**
 * Fetch a protected file and create a temporary browser Blob URL.
 * Automatically attaches user's JWT Authorization token via api interceptor.
 * 
 * @param {string} endpointUrl - Relative API endpoint e.g. '/files/lesson/123/pdf/456'
 * @returns {Promise<{ blobUrl: string, blob: Blob, contentType: string, revoke: () => void }>}
 */
export async function fetchBlobUrl(endpointUrl) {
  if (!endpointUrl) {
    throw new Error('Endpoint URL is required');
  }

  // Normalize endpoint URL
  let cleanUrl = endpointUrl;
  if (cleanUrl.startsWith('http')) {
    try {
      const urlObj = new URL(cleanUrl);
      cleanUrl = urlObj.pathname.replace(/^\/api\/?/, '/');
    } catch (e) {}
  }
  if (!cleanUrl.startsWith('/')) {
    cleanUrl = `/${cleanUrl}`;
  }

  const response = await api.get(cleanUrl, {
    responseType: 'blob'
  });

  const contentType = response.headers['content-type'] || 'application/octet-stream';
  const blob = new Blob([response.data], { type: contentType });
  const blobUrl = URL.createObjectURL(blob);

  return {
    blobUrl,
    blob,
    contentType,
    revoke: () => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (e) {}
    }
  };
}

/**
 * Trigger an authenticated file download in the browser.
 * 
 * @param {string} endpointUrl - API endpoint e.g. '/files/assignment/123?download=true'
 * @param {string} fallbackFilename - Fallback filename if server header is omitted
 */
export async function downloadProtectedFile(endpointUrl, fallbackFilename = 'download') {
  try {
    const { blobUrl, blob, revoke } = await fetchBlobUrl(endpointUrl);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fallbackFilename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup after small delay
    setTimeout(() => {
      document.body.removeChild(link);
      revoke();
    }, 1000);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

/**
 * Helpers to construct standardized protected file endpoints
 */
export const protectedUrls = {
  lessonPdf: (lessonId, pdfId, download = false) => 
    `/files/lesson/${lessonId}/pdf/${pdfId}${download ? '?download=true' : ''}`,
    
  assignment: (assignmentId, download = false) => 
    `/files/assignment/${assignmentId}${download ? '?download=true' : ''}`,
    
  submission: (submissionId, download = false) => 
    `/files/submission/${submissionId}${download ? '?download=true' : ''}`,
    
  messageAttachment: (messageId, index = 0, download = false) => 
    `/files/message/${messageId}/${index}${download ? '?download=true' : ''}`,
    
  liveFile: (lessonId, filename) => 
    `/files/live/${lessonId}/file/${filename}`,
    
  quizImage: (quizId, questionId) => 
    `/files/quiz/${quizId}/question/${questionId}`,
    
  paymentSlip: (paymentId, download = false) => 
    `/files/payment/${paymentId}/slip${download ? '?download=true' : ''}`
};

export default {
  fetchBlobUrl,
  downloadProtectedFile,
  protectedUrls
};
