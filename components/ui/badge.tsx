import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  [
    'inline-flex items-center justify-center',
    'px-2.5 py-0.5',
    'rounded-full',
    'text-xs font-medium font-sans',
    'border',
    'whitespace-nowrap',
    'transition-colors',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-[#6366F1]/20 text-[#818CF8]',
          'border-[#6366F1]/30',
        ],
        success: [
          'bg-emerald-500/15 text-emerald-400',
          'border-emerald-500/30',
        ],
        warning: [
          'bg-amber-500/15 text-amber-400',
          'border-amber-500/30',
        ],
        danger: [
          'bg-red-500/15 text-red-400',
          'border-red-500/30',
        ],
        muted: [
          'bg-white/5 text-[#64748B]',
          'border-[#1E1E2E]',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
