export function PostCardSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="aspect-[4/3] animate-pulse bg-paper-strong" />
      <div className="h-3 w-32 animate-pulse bg-paper-strong" />
      <div className="h-7 w-11/12 animate-pulse bg-paper-strong" />
      <div className="h-7 w-2/3 animate-pulse bg-paper-strong" />
      <div className="space-y-2 pt-1">
        <div className="h-3.5 w-full animate-pulse bg-paper-strong" />
        <div className="h-3.5 w-4/5 animate-pulse bg-paper-strong" />
      </div>
    </div>
  )
}

interface PostGridSkeletonProps {
  count?: number
}

export function PostGridSkeleton({ count = 6 }: PostGridSkeletonProps) {
  return (
    <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <PostCardSkeleton key={index} />
      ))}
    </div>
  )
}
