import type {
  BlogComment,
  CommentCreatePayload,
  CommentUpdatePayload,
  ListCommentsParams,
  PageResponse,
} from '../types/api'
import api from './client'

export async function listComments(
  params: ListCommentsParams,
  signal?: AbortSignal,
): Promise<PageResponse<BlogComment>> {
  const { data } = await api.get<PageResponse<BlogComment>>('/comments', {
    params: {
      post_id: params.postId,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    },
    signal,
  })
  return data
}

export async function getComment(
  commentId: number,
  signal?: AbortSignal,
): Promise<BlogComment> {
  const { data } = await api.get<BlogComment>(`/comments/${commentId}`, {
    signal,
  })
  return data
}

export async function createComment(
  payload: CommentCreatePayload,
): Promise<BlogComment> {
  const { data } = await api.post<BlogComment>('/comments', payload)
  return data
}

export async function updateComment(
  commentId: number,
  payload: CommentUpdatePayload,
): Promise<BlogComment> {
  const { data } = await api.put<BlogComment>(
    `/comments/${commentId}`,
    payload,
  )
  return data
}

export async function deleteComment(commentId: number): Promise<void> {
  await api.delete(`/comments/${commentId}`)
}
