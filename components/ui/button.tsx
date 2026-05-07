import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-sans font-medium text-sm',
    'rounded-lg',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]',
    'disabled:pointer-events-none disabled:opacity-40',
    'select-none',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-[#6366F1] text-[#F1F5F9]',
          'hover:bg-[#818CF8]',
          'hover:shadow-[0_0_20px_rgba(99,102,241,0.45)]',
          'active:bg-[#4F52C9] active:shadow-none',
        ],
        outline: [
          'border border-[#1E1E2E] bg-transparent text-[#F1F5F9]',
          'hover:border-[#6366F1] hover:bg-[#6366F1]/10',
          'active:bg-[#6366F1]/20',
        ],
        ghost: [
          'bg-transparent text-[#64748B]',
          'hover:bg-white/5 hover:text-[#F1F5F9]',
          'active:bg-white/10',
        ],
        destructive: [
          'bg-red-600/90 text-[#F1F5F9]',
          'hover:bg-red-500 hover:shadow-[0_0_16px_rgba(239,68,68,0.4)]',
          'active:bg-red-700 active:shadow-none',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md',
        default: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
