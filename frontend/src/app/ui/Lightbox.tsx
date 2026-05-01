import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { X, ImageOff } from 'lucide-react';
import { useTelegram } from '../lib/telegram';
import { SPRING_CONFIG } from '../lib/constants';

/**
 * Shape of a single image displayed inside the Lightbox.
 * `id` must be globally unique — it is used as the `layoutId` that powers the
 * shared-element morph transition between the thumbnail and the full-screen view.
 */
export interface LightboxImage {
  id: string;
  src: string;
  label?: string;
  caption?: string;
}

interface LightboxProps {
  image: LightboxImage | null;
  onClose: () => void;
}

/**
 * Full-screen image viewer with a morph-from-thumbnail animation.
 *
 * Render this component once at the top of the screen that owns the gallery;
 * pass the currently selected image (or `null` when nothing is open) via the
 * `image` prop. The matching thumbnail must be a `<motion.*>` element rendered
 * elsewhere in the tree with `layoutId={`lightbox-${image.id}`}` — Framer
 * Motion handles the shared-layout transition between the two.
 *
 * Dismiss gestures:
 *  - tap outside the image
 *  - drag the image downwards (swipe-to-dismiss)
 *  - press the close button (top right, respects safe-area inset)
 *  - hit Escape on a keyboard
 */
export function Lightbox({ image, onClose }: LightboxProps) {
  const { haptic } = useTelegram();
  const [imgError, setImgError] = useState(false);

  // Reset error state when switching images
  useEffect(() => {
    setImgError(false);
  }, [image?.src]);

  // Body scroll lock + keyboard shortcut
  useEffect(() => {
    if (!image) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [image, onClose]);

  const handleClose = () => {
    haptic.light();
    onClose();
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // Dismiss if the user swiped far or fast enough.
    if (Math.abs(info.offset.y) > 120 || Math.abs(info.velocity.y) > 500) {
      handleClose();
    }
  };

  const content = (
    <AnimatePresence>
      {image && (
        <motion.div
          key="lightbox-shell"
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label={image.label ?? 'Image viewer'}
        >
          {/* Dimmed, blurred backdrop */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

          {/* Close button (top-right, safe-area aware) */}
          <motion.button
            type="button"
            className="absolute right-4 z-[110] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
            style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
            onClick={(event) => {
              event.stopPropagation();
              handleClose();
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ delay: 0.08, duration: 0.2 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Close image viewer"
          >
            <X className="h-5 w-5" />
          </motion.button>

          {/* Draggable, morphing image container */}
          <motion.div
            layoutId={`lightbox-${image.id}`}
            className="relative z-[105] flex h-full w-full items-center justify-center px-4"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.35}
            onDragEnd={handleDragEnd}
            onClick={(event) => event.stopPropagation()}
            transition={SPRING_CONFIG}
          >
            {imgError ? (
              <div className="flex flex-col items-center justify-center gap-3 text-white/60">
                <ImageOff className="h-16 w-16 opacity-40" />
                <span className="text-sm">Image unavailable</span>
              </div>
            ) : (
              <motion.img
                src={image.src}
                alt={image.label ?? ''}
                className="pointer-events-none max-h-[68vh] max-w-full select-none rounded-2xl object-contain"
                draggable={false}
                onError={() => setImgError(true)}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0.4 }}
                transition={{ duration: 0.25 }}
              />
            )}
          </motion.div>

          {/* Caption */}
          {(image.label || image.caption) && (
            <motion.div
              className="pointer-events-none absolute left-0 right-0 z-[108] flex justify-center px-6"
              style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ delay: 0.12, duration: 0.25 }}
            >
              <div className="rounded-2xl bg-black/60 backdrop-blur-sm px-5 py-3 text-center max-w-[80%]">
                {image.label && (
                  <div className="text-sm font-medium text-white">{image.label}</div>
                )}
                {image.caption && (
                  <div className="mt-0.5 text-[11px] text-white/60">{image.caption}</div>
                )}
                <div className="mt-1.5 text-[9px] uppercase tracking-wider text-white/35">
                  Swipe down to close
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render into <body> so it always overlays everything, regardless of the
  // current stacking context of the parent screen.
  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
