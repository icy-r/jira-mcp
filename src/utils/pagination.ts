/**
 * Pagination utilities for Jira API responses.
 * @module utils/pagination
 */

import type { PaginatedResponse, PaginationParams } from '../types/index.js';

/**
 * Default pagination settings.
 */
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

/**
 * Normalizes pagination parameters.
 */
export function normalizePaginationParams(
  params?: PaginationParams
): Required<PaginationParams> {
  return {
    startAt: params?.startAt ?? 0,
    maxResults: Math.min(
      params?.maxResults ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE
    ),
  };
}

/**
 * Checks if there are more pages to fetch.
 */
export function hasMorePages<T>(response: PaginatedResponse<T>): boolean {
  if (response.isLast !== undefined) {
    return !response.isLast;
  }
  return response.startAt + response.values.length < response.total;
}

/**
 * Gets the next page parameters.
 */
export function getNextPageParams<T>(
  response: PaginatedResponse<T>
): PaginationParams | null {
  if (!hasMorePages(response)) {
    return null;
  }
  return {
    startAt: response.startAt + response.values.length,
    maxResults: response.maxResults,
  };
}

/**
 * Fetches all pages of a paginated resource.
 * @param fetchPage - Function to fetch a single page
 * @param initialParams - Initial pagination parameters
 * @param maxPages - Maximum number of pages to fetch (safety limit)
 */
export async function fetchAllPages<T>(
  fetchPage: (params: PaginationParams) => Promise<PaginatedResponse<T>>,
  initialParams?: PaginationParams,
  maxPages: number = 10
): Promise<T[]> {
  const allResults: T[] = [];
  let currentParams = normalizePaginationParams(initialParams);
  let pageCount = 0;

  while (pageCount < maxPages) {
    const response = await fetchPage(currentParams);
    allResults.push(...response.values);
    pageCount++;

    const nextParams = getNextPageParams(response);
    if (!nextParams) {
      break;
    }
    currentParams = normalizePaginationParams(nextParams);
  }

  return allResults;
}

/**
 * Creates a paginated response from an array.
 */
export function createPaginatedResponse<T>(
  items: T[],
  params: PaginationParams
): PaginatedResponse<T> {
  const { startAt, maxResults } = normalizePaginationParams(params);
  const values = items.slice(startAt, startAt + maxResults);

  return {
    startAt,
    maxResults,
    total: items.length,
    values,
    isLast: startAt + values.length >= items.length,
  };
}
