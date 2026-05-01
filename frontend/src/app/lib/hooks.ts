import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Анимирует число от 0 до target за указанное время.
 * Использует requestAnimationFrame + ease-out (аналогично ease-out-cubic).
 * Уважает prefers-reduced-motion — моментально возвращает target.
 */
export function useCountUp(target: number, duration = 800, delay = 0): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setValue(target);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startRef.current = null;
      const tick = (ts: number) => {
        if (startRef.current === null) startRef.current = ts;
        const elapsed = ts - startRef.current;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out-cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(target * eased);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setValue(target);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);

  return value;
}

const FAVORITES_KEY = 'scanberry_favorites';

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(ids: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);

  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  return { favorites, toggle, isFavorite };
}

/**
 * Возвращает CSS-классы и inline-стили для safe-area insets (iOS notch, Android gesture bar).
 * Использует CSS-переменные --safe-top / --safe-bottom из theme.css.
 */
export function useSafeArea() {
  return useMemo(
    () => ({
      className: {
        top: 'pt-safe',
        bottom: 'pb-safe',
        screen: 'min-h-screen-safe',
      },
      style: {
        paddingTop: 'calc(var(--safe-top) + 0.5rem)',
        paddingBottom: 'calc(var(--safe-bottom) + 0.5rem)',
      },
    }),
    [],
  );
}
