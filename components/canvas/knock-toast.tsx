'use client';

import { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, X } from 'lucide-react';
import { useOfficeStore, type KnockNotification } from '@/lib/store/office';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTO_DISMISS_MS = 8_000;

// ---------------------------------------------------------------------------
// Single knock item
// ---------------------------------------------------------------------------

interface KnockItemProps {
  knock: KnockNotification;
  onAccept: () => void;
  onDismiss: () => void;
}

function KnockItem({ knock, onAccept, onDismiss }: KnockItemProps) {
  // Stable callback refs so the timer cleanup never fires stale closures.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Auto-dismiss after AUTO_DISMISS_MS. The timer key is the knock id so a
  // new knock from the same user correctly resets the timer.
  useEffect(() => {
    const id = setTimeout(() => dismissRef.current(), AUTO_DISMISS_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knock.id]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -24, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -24, scale: 0.95, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      role="alert"
      aria-live="polite"
      className="relative w-72 overflow-hidden rounded-xl"
      style={{
        background: '#13131A',
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.55)',
      }}
    >
      {/* Auto-dismiss progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-[2px] bg-[#6366F1]"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
      />

      <div className="space-y-3 p-4">
        {/* Content row */}
        <div className="flex items-start gap-3">
          <span className="shrink-0 text-xl leading-none" aria-hidden="true">
            🚪
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#F1F5F9]">
              {knock.from_display_name}
            </p>
            <p className="mt-0.5 text-xs text-[#64748B]">
              frappe à votre porte
            </p>
          </div>
          {/* Dismiss X */}
          <button
            onClick={onDismiss}
            className="shrink-0 rounded p-0.5 text-[#64748B] transition-colors hover:bg-white/5 hover:text-[#F1F5F9]"
            aria-label="Ignorer"
          >
            <X size={13} />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#6366F1] py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#818CF8]"
          >
            <Phone size={12} />
            Répondre
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 rounded-lg bg-[#1E1E2E] py-1.5 text-xs font-medium text-[#64748B] transition-colors hover:bg-white/5 hover:text-[#F1F5F9]"
          >
            Ignorer
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Container — rendered once at the app layout level
// ---------------------------------------------------------------------------

export interface KnockToastContainerProps {
  onAcceptKnock: (fromUserId: string) => void;
}

export function KnockToastContainer({ onAcceptKnock }: KnockToastContainerProps) {
  const { knockNotifications, dismissKnock } = useOfficeStore();

  const handleAccept = useCallback(
    (knock: KnockNotification) => {
      onAcceptKnock(knock.from_user_id);
      dismissKnock(knock.id);
    },
    [onAcceptKnock, dismissKnock]
  );

  const handleDismiss = useCallback(
    (id: string) => {
      dismissKnock(id);
    },
    [dismissKnock]
  );

  return (
    <div
      className="fixed bottom-20 left-4 z-50 flex flex-col gap-2"
      aria-label="Notifications de frappe"
    >
      <AnimatePresence mode="popLayout">
        {knockNotifications.map((knock) => (
          <KnockItem
            key={knock.id}
            knock={knock}
            onAccept={() => handleAccept(knock)}
            onDismiss={() => handleDismiss(knock.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
