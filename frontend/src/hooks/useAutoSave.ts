import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * Debounces an async save function and shows a toast on error.
 * Re-triggers save whenever deps change (after the delay).
 */
export function useAutoSave(fn: () => Promise<void>, delay: number, deps: unknown[]) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);

  // Keep fnRef current so we always call the latest version
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        await fnRef.current();
      } catch {
        toast.error('Auto-save failed. Changes may not be saved.');
      }
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
