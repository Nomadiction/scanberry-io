import { useRef, useCallback } from 'react';
import { Star, Trash2 } from 'lucide-react';

const ACTION_W = 72;
const TRIGGER = 62;
const HOLD_MS = 128;

interface SwipeableRowProps {
  children: React.ReactNode;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
}

export function SwipeableRow({ children, isFavorite, onToggleFavorite, onDelete }: SwipeableRowProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const starRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);

  const startX = useRef(0);
  const curOffset = useRef(0);
  const dragging = useRef(false);
  const fired = useRef(false);
  const locked = useRef<'none' | 'l' | 'r'>('none');
  const raf = useRef(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>();

  const setX = (px: number) => {
    cardRef.current!.style.transform = `translate3d(${px}px,0,0)`;
  };

  const animateTo = (px: number, ms = 300) =>
    new Promise<void>(resolve => {
      const el = cardRef.current!;
      el.style.transition = `transform ${ms}ms cubic-bezier(.25,1,.5,1)`;
      el.style.transform = `translate3d(${px}px,0,0)`;
      const done = () => { el.style.transition = ''; el.removeEventListener('transitionend', done); resolve(); };
      el.addEventListener('transitionend', done);
      setTimeout(done, ms + 50);
    });

  const paint = (offset: number) => {
    const abs = Math.abs(offset);
    const t = Math.min(abs / TRIGGER, 1);
    const past = abs >= TRIGGER;

    if (offset > 0 && starRef.current) {
      const s = 0.55 + t * 0.45;
      starRef.current.style.transform = `scale(${past ? 1.08 : s})`;
      starRef.current.style.opacity = `${(0.3 + t * 0.7).toFixed(2)}`;
    }
    if (offset < 0 && trashRef.current) {
      const s = 0.55 + t * 0.45;
      trashRef.current.style.transform = `scale(${past ? 1.08 : s})`;
      trashRef.current.style.opacity = `${(0.3 + t * 0.7).toFixed(2)}`;
    }
  };

  const reset = () => {
    if (starRef.current) { starRef.current.style.transform = 'scale(0.45)'; starRef.current.style.opacity = '0'; }
    if (trashRef.current) { trashRef.current.style.transform = 'scale(0.45)'; trashRef.current.style.opacity = '0'; }
  };

  const onDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    clearTimeout(holdTimer.current);
    dragging.current = false;
    fired.current = false;
    locked.current = 'none';
    startX.current = e.clientX;
    curOffset.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - startX.current;

    if (!dragging.current) {
      if (Math.abs(dx) < 6) return;
      dragging.current = true;
      locked.current = dx > 0 ? 'r' : 'l';
    }

    let offset: number;
    if (locked.current === 'r') {
      offset = Math.max(0, dx);
      if (offset > ACTION_W) offset = ACTION_W + (offset - ACTION_W) * 0.1;
    } else {
      offset = Math.min(0, dx);
      if (offset < -ACTION_W) offset = -ACTION_W + (offset + ACTION_W) * 0.1;
    }
    curOffset.current = offset;

    if (!fired.current && Math.abs(offset) >= TRIGGER) {
      fired.current = true;
      try { navigator.vibrate?.(10); } catch { /* */ }
    }
    if (fired.current && Math.abs(offset) < TRIGGER * 0.55) fired.current = false;

    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => { setX(offset); paint(offset); });
  }, []);

  const onUp = useCallback(async (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
    cancelAnimationFrame(raf.current);
    if (!dragging.current) { reset(); return; }

    const wasFired = fired.current;
    const dir = locked.current;

    if (wasFired && dir === 'r') {
      onToggleFavorite?.();
      await animateTo(ACTION_W, 140);
      await new Promise<void>(r => { holdTimer.current = setTimeout(r, HOLD_MS); });
      await animateTo(0, 240);
      reset();
    } else if (wasFired && dir === 'l') {
      onDelete?.();
      await animateTo(0, 220);
      reset();
    } else {
      await animateTo(0, 200);
      reset();
    }

    dragging.current = false;
    fired.current = false;
    locked.current = 'none';
  }, [onToggleFavorite, onDelete]);

  const blockClick = useCallback((e: React.MouseEvent) => {
    if (Math.abs(curOffset.current) > 6) { e.stopPropagation(); e.preventDefault(); }
  }, []);

  return (
    <div className="relative rounded-xl">
      {/* Underlay */}
      <div className="absolute inset-0 rounded-xl bg-muted/40 overflow-hidden flex items-center justify-between px-6">
        <div ref={starRef} className="pointer-events-none" style={{ opacity: 0, transform: 'scale(0.45)' }}>
          <Star className={`w-5 h-5 ${isFavorite ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/80'}`} />
        </div>
        <div ref={trashRef} className="pointer-events-none" style={{ opacity: 0, transform: 'scale(0.45)' }}>
          <Trash2 className="w-5 h-5 text-destructive/70" />
        </div>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={blockClick}
        className="relative z-10 touch-pan-y select-none"
        style={{ willChange: 'transform' }}
      >
        {children}
      </div>
    </div>
  );
}
