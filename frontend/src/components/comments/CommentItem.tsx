import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import {
  deleteComment,
  getComment,
  updateComment,
} from '../../api/comments'
import type { BlogComment, User } from '../../types/api'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatDate, formatFullDate, getAuthorName } from '../../utils/format'
import { resolveMediaUrl } from '../../utils/media'
import { validateComment } from '../../utils/validation'
import { Alert } from '../ui/Alert'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { TextareaField } from '../ui/FormField'

interface CommentItemProps {
  comment: BlogComment
  currentUser: User | null
  onUpdated: (comment: BlogComment) => void
  onDeleted: (commentId: number) => void
}

export function CommentItem({
  comment,
  currentUser,
  onUpdated,
  onDeleted,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isPreparingEdit, setIsPreparingEdit] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [editError, setEditError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isOwner = currentUser?.id === comment.author_id
  const wasEdited = comment.updated_at !== comment.created_at
  const authorName = getAuthorName(comment.author)

  const beginEditing = async () => {
    setActionError(null)
    setIsPreparingEdit(true)
    try {
      const freshComment = await getComment(comment.id)
      setEditContent(freshComment.content)
      setEditError(null)
      setIsEditing(true)
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, 'The comment could not be opened for editing.'),
      )
    } finally {
      setIsPreparingEdit(false)
    }
  }

  const handleSave = async () => {
    const validationError = validateComment(editContent)
    setEditError(validationError)
    if (validationError) {
      return
    }

    setIsSaving(true)
    setActionError(null)
    try {
      const updated = await updateComment(comment.id, {
        content: editContent.trim(),
      })
      onUpdated(updated)
      setIsEditing(false)
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, 'Your changes could not be saved.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setActionError(null)
    try {
      await deleteComment(comment.id)
      setDeleteOpen(false)
      onDeleted(comment.id)
    } catch (error) {
      setDeleteOpen(false)
      setActionError(
        getApiErrorMessage(error, 'The response could not be deleted.'),
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <article className="py-7" aria-busy={isDeleting || isSaving}>
      <div className="flex items-start gap-3">
        <Avatar
          name={authorName}
          src={resolveMediaUrl(comment.author.avatar_path)}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-ink">{authorName}</p>
            <span className="text-xs text-muted">
              @{comment.author.username}
            </span>
            {isOwner && (
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-accent">
                You
              </span>
            )}
            <span className="text-muted/50" aria-hidden="true">
              ·
            </span>
            <time
              className="text-xs text-muted"
              dateTime={comment.created_at}
              title={formatFullDate(comment.created_at)}
            >
              {formatDate(comment.created_at)}
            </time>
            {wasEdited && (
              <span className="text-[0.65rem] uppercase tracking-[0.12em] text-muted">
                Edited
              </span>
            )}
          </div>

          {actionError && (
            <Alert tone="error" className="mt-3">
              {actionError}
            </Alert>
          )}

          {isEditing ? (
            <div className="mt-4 space-y-3">
              <TextareaField
                label="Edit your response"
                id={`comment-${comment.id}`}
                name={`comment-${comment.id}`}
                value={editContent}
                maxLength={2000}
                onChange={(event) => {
                  setEditContent(event.target.value)
                  setEditError(null)
                }}
                error={editError ?? undefined}
                hint={`${editContent.length} / 2,000`}
                rows={4}
                disabled={isSaving}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  isLoading={isSaving}
                  disabled={isSaving}
                >
                  Save changes
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false)
                    setEditContent(comment.content)
                    setEditError(null)
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 whitespace-pre-line text-[0.93rem] leading-7 text-ink-soft">
              {comment.content}
            </p>
          )}

          {isOwner && !isEditing && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={beginEditing}
                disabled={isPreparingEdit}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-accent disabled:opacity-50"
              >
                <Pencil className="size-3.5" aria-hidden="true" />
                {isPreparingEdit ? 'Opening…' : 'Edit'}
              </button>
              <span className="text-line" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-wine"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this response?"
        description="This action cannot be undone. The response will be removed from the conversation."
        confirmLabel="Delete response"
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onOpenChange={setDeleteOpen}
      />
    </article>
  )
}
