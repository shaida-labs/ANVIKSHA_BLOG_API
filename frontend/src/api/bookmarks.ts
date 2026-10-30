import type {
  BookmarkCollection,
  BookmarkedPost,
  ListBookmarksParams,
  PageResponse,
} from '../types/api'
import api from './client'

export async function listBookmarks(
  params: ListBookmarksParams = {},
  signal?: AbortSignal,
): Promise<PageResponse<BookmarkedPost>> {
  const { data } = await api.get<PageResponse<BookmarkedPost>>('/bookmarks', {
    params: {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
      search: params.search || undefined,
      topic: params.topic || undefined,
      collection: params.collection || undefined,
      sort: params.sort ?? 'saved_newest',
    },
    signal,
  })
  return data
}

export async function listBookmarkCollections(
  signal?: AbortSignal,
): Promise<BookmarkCollection[]> {
  const { data } = await api.get<BookmarkCollection[]>('/bookmarks/collections', {
    signal,
  })
  return data
}
