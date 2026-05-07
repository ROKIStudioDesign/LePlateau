'use client';

/**
 * Thin SSR-safe wrapper around OfficeCanvas.
 *
 * react-konva / Konva access `window` at import time, so it must never be
 * bundled into the server render. This file uses next/dynamic with ssr:false
 * and re-exports the same OfficeCanvasProps interface so callers never have
 * to import from the inner file.
 */

import dynamic from 'next/dynamic';
import type { OfficeCanvasProps } from './office-canvas';

// Re-export the prop type so callers can import it from this wrapper.
export type { OfficeCanvasProps };

const OfficeCanvasDynamic = dynamic<OfficeCanvasProps>(
  () => import('./office-canvas'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#0A0A0F]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E1E2E] border-t-[#6366F1]" />
          <p className="text-xs text-slate-500">Chargement du plateau…</p>
        </div>
      </div>
    ),
  }
);

export default function OfficeCanvasWrapper(props: OfficeCanvasProps) {
  return <OfficeCanvasDynamic {...props} />;
}

// Named re-export for backwards compat with any existing imports.
export { OfficeCanvasDynamic as OfficeCanvas };
