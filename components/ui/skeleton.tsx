import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render as a circle (for avatar placeholders) */
  circle?: boolean
}

function Skeleton({ className, circle = false, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'bg-[#1E1E2E]',
        circle ? 'rounded-full' : 'rounded-lg',
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent',
        'before:animate-[shimmer_1.6s_ease-in-out_infinite]',
        className
      )}
      style={
        {
          '--shimmer-translate': '-100%',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

// Shimmer keyframe injected once via a style tag approach — handled in globals.css
// But we also define it inline here for portability.
function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  )
}

export { Skeleton, SkeletonText }
