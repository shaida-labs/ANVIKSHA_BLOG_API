export interface UserSummary {
  id: number
  username: string
  display_name: string | null
  avatar_path: string | null
}

export interface User extends UserSummary {
  email: string
  bio: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Post {
  id: number
  title: string
  excerpt: string | null
  content: string
  topic: string | null
  cover_image_path: string | null
  /** Legacy field for posts created before the upload workflow. */
  cover_image_url: string | null
  comment_count: number
  like_count: number
  liked_by_me: boolean
  bookmarked_by_me: boolean
  author_id: number
  author: UserSummary
  created_at: string
  updated_at: string
}

export interface BookmarkedPost extends Post {
  bookmarked_at: string
  collection: string | null
}

export interface UploadedImage {
  path: string
  url: string
  content_type: 'image/jpeg' | 'image/png' | 'image/webp'
  size: number
  width: number
  height: number
}

export interface BlogComment {
  id: number
  content: string
  post_id: number
  author_id: number
  author: UserSummary
  created_at: string
  updated_at: string
}

export interface PageResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export type PostSort = 'newest' | 'oldest' | 'title' | 'popular'
export type BookmarkSort = 'saved_newest' | 'saved_oldest' | 'title'

export interface ListPostsParams {
  limit?: number
  offset?: number
  search?: string
  topic?: string
  author?: string
  sort?: PostSort
}

export interface ListBookmarksParams {
  limit?: number
  offset?: number
  search?: string
  topic?: string
  collection?: string
  sort?: BookmarkSort
}

export interface ListCommentsParams {
  postId: number
  limit?: number
  offset?: number
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

export interface PostPayload {
  title: string
  excerpt: string | null
  content: string
  topic: string | null
  cover_image_path: string | null
}

export interface CommentCreatePayload {
  post_id: number
  content: string
}

export interface CommentUpdatePayload {
  content: string
}

export interface TokenResponse {
  access_token: string
  token_type: 'bearer'
  expires_in: number
}

export interface LikeState {
  liked: boolean
  like_count: number
}

export interface BookmarkState {
  bookmarked: boolean
  collection: string | null
}

export interface BookmarkUpdatePayload {
  collection: string | null
}

export interface Topic {
  name: string
  count: number
}

export interface UserProfile {
  id: number
  username: string
  display_name: string | null
  bio: string | null
  avatar_path: string | null
  created_at: string
  post_count: number
  comment_count: number
  likes_received: number
}

export interface UserProfileUpdatePayload {
  display_name: string | null
  bio: string | null
}

export interface BookmarkCollection {
  name: string
  count: number
}
