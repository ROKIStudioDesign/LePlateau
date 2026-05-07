'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/utils'

const SIZE_MAP = {
  sm: 32,
  md: 40,
  lg: 56,
} as const

type AvatarSize = keyof typeof SIZE_MAP

export interface AvatarProps {
  src?: string | null
  name?: string
  size?: AvatarSize
  statusColor?: string
  speaking?: boolean
  className?: string
}

function Avatar({
  src,
  name,
  size = 'md',
  statusColor,
  speaking = false,
  className,
}: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)
  const px = SIZE_MAP[size]
  const showImage = src && !imgError
  const initials = name ? getInitials(name) : '?'

  const textSize =
    size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'

  return (
    <div
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: px, height: px }}
    >
      {/* Speaking glow ring */}
      {speaking && (
        <span
          className="absolute inset-0 rounded-full animate-pulse-glow pointer-events-none"
          style={{
            boxShadow: `0 0 0 3px ${statusColor ?? '#22D3EE'}, 0 0 16px ${statusColor ?? '#22D3EE'}66`,
            borderRadius: '50%',
          }}
        />
      )}

      {/* Border ring from statusColor */}
      {statusColor && !speaking && (
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: `0 0 0 2px ${statusColor}`,
            borderRadius: '50%',
          }}
        />
      )}

      {/* Avatar face */}
      <div
        className={cn(
          'w-full h-full rounded-full overflow-hidden',
          'bg-[#1E1E2E] flex items-center justify-center',
          'font-display font-semibold text-[#F1F5F9]',
          textSize
        )}
      >
        {showImage ? (
          <img
            src={src}
            alt={name ?? 'avatar'}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
    </div>
  )
}

export { Avatar }
