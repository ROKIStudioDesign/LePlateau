'use client'

import * as React from 'react'
import { createContext, useContext, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastVariant = 'default' | 'success' | 'error'

interface Toast {
  id: string
  message: string
  variant?: ToastVariant
  title?: string
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (opts: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <Toaster />')
  return ctx
}

// ─── Provider + Toaster ───────────────────────────────────────────────────────

function Toaster({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (opts: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { ...opts, id }])
      const timer = setTimeout(() => dismiss(id), 4000)
      timers.current.set(id, timer)
    },
    [dismiss]
  )

  // Cleanup on unmount
  useEffect(() => {
    const currentTimers = timers.current
    return () => {
      currentTimers.forEach((t) => clearTimeout(t))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ─── Toast region (bottom-right) ──────────────────────────────────────────────

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: 'border-[#1E1E2E] bg-[#13131A]',
  success: 'border-emerald-500/40 bg-[#13131A]',
  error: 'border-red-500/40 bg-[#13131A]',
}

const VARIANT_ICON: Record<ToastVariant, React.ReactNode> = {
  default: (
    <span className="w-2 h-2 rounded-full bg-[#6366F1] mt-1 shrink-0" />
  ),
  success: (
    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
}

function ToastRegion({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) {
  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: string) => void
}) {
  const variant: ToastVariant = toast.variant ?? 'default'

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border',
        'min-w-[280px] max-w-[360px]',
        'shadow-[0_0_0_1px_rgba(255,255,255,0.04),_0_8px_32px_rgba(0,0,0,0.5)]',
        'animate-slide-in-right',
        VARIANT_STYLES[variant]
      )}
      role="alert"
    >
      {VARIANT_ICON[variant]}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-[#F1F5F9] font-sans">{toast.title}</p>
        )}
        <p className="text-sm text-[#64748B] font-sans leading-snug">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-[#64748B] hover:text-[#F1F5F9] transition-colors mt-0.5"
        aria-label="Fermer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export { Toaster, useToast }
export type { Toast, ToastVariant }
