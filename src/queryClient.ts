import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { del, get, set } from 'idb-keyval'

const DAY = 24 * 60 * 60 * 1000

/** How long cached API responses survive across reloads. */
export const CACHE_MAX_AGE = 30 * DAY

/**
 * OpenF1 history doesn't change, so queries never go stale by default and the cache
 * is persisted to IndexedDB. Queries for current/recent events override staleTime
 * in api/queries.ts.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      // Never evict from memory. Note gcTime can't simply be CACHE_MAX_AGE: setTimeout overflows
      // past ~24.8 days and fires immediately, which would drop every restored query.
      gcTime: Infinity,
      retry: false, // the API client already retries 429s within the rate limit
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})

export const persister = createAsyncStoragePersister({
  storage: { getItem: get, setItem: set, removeItem: del },
  key: 'f1-stats-cache',
  throttleTime: 2000,
})

/** Bump to drop everyone's persisted cache, e.g. after changing the shape of cached data. */
export const CACHE_BUSTER = 'v1'
