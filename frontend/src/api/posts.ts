import type {
  BookmarkState,
  BookmarkUpdatePayload,
  LikeState,
  ListPostsParams,
  PageResponse,
  Post,
  PostPayload,
} from '../types/api'
import api from './client'

export async function listPosts(
  params: ListPostsParams = {},
  signal?: AbortSignal,
): Promise<PageResponse<Post>> {
  const { data } = await api.get<PageResponse<Post>>('/posts', {
    params: {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
      search: params.search || undefined,
      topic: params.topic || undefined,
      author: params.author || undefined,
      sort: params.sort ?? 'newest',
    },
    signal,
  })
  return data
}

export async function listMyPosts(
  params: ListPostsParams = {},
  signal?: AbortSignal,
): Promise<PageResponse<Post>> {
  const { data } = await api.get<PageResponse<Post>>('/posts/mine', {
    params: {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
      search: params.search || undefined,
      topic: params.topic || undefined,
      sort: params.sort ?? 'newest',
    },
    signal,
  })
  return data
}

export async function getPost(
  postId: number,
  signal?: AbortSignal,
): Promise<Post> {
  const { data } = await api.get<Post>(`/posts/${postId}`, { signal })
  return data
}

export async function createPost(payload: PostPayload): Promise<Post> {
  const { data } = await api.post<Post>('/posts', payload)
  return data
}

export async function updatePost(
  postId: number,
  payload: PostPayload,
): Promise<Post> {
  const { data } = await api.put<Post>(`/posts/${postId}`, payload)
  return data
}

export async function deletePost(postId: number): Promise<void> {
  await api.delete(`/posts/${postId}`)
}

export async function likePost(postId: number): Promise<LikeState> {
  const { data } = await api.post<LikeState>(`/posts/${postId}/like`)
  return data
}

export async function unlikePost(postId: number): Promise<LikeState> {
  const { data } = await api.delete<LikeState>(`/posts/${postId}/like`)
  return data
}

export async function bookmarkPost(postId: number): Promise<BookmarkState> {
  const { data } = await api.post<BookmarkState>(`/posts/${postId}/bookmark`)
  return data
}

export async function unbookmarkPost(postId: number): Promise<BookmarkState> {
  const { data } = await api.delete<BookmarkState>(`/posts/${postId}/bookmark`)
  return data
}

export async function updateBookmarkCollection(
  postId: number,
  payload: BookmarkUpdatePayload,
): Promise<BookmarkState> {
  const { data } = await api.patch<BookmarkState>(
    `/posts/${postId}/bookmark`,
    payload,
  )
  return data
}
