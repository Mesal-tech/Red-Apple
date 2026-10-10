import { apiRequest } from './apiClient';

/**
 * Fetches educational articles with category and search filter support.
 */
export async function getEducationArticles(category, search) {
  const queryParams = new URLSearchParams();
  if (category && category !== 'ALL') {
    queryParams.append('category', category);
  }
  if (search) {
    queryParams.append('search', search);
  }

  const queryStr = queryParams.toString();
  const endpoint = `/education${queryStr ? `?${queryStr}` : ''}`;

  return await apiRequest(endpoint, {
    method: 'GET',
    skipAuth: true, // Education library is accessible publicly
  });
}

/**
 * Fetches a single educational article with full clinical details
 */
export async function getEducationArticleById(id) {
  return await apiRequest(`/education/${encodeURIComponent(id)}`, {
    method: 'GET',
    skipAuth: true,
  });
}
