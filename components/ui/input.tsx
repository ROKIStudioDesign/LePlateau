import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[#64748B] uppercase tracking-wide font-sans"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            'w-full h-10 px-3',
            'bg-[#13131A] text-[#F1F5F9]',
            'border border-[#1E1E2E] rounded-lg',
            'font-sans text-sm',
            'placeholder:text-[#64748B]',
            'transition-all duration-150',
            'outline-none',
            'focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/25',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/25',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-400 font-sans">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
