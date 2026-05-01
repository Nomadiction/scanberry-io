import { motion } from 'motion/react';
import { useState, useCallback } from 'react';
import { Maximize2, ImageOff } from 'lucide-react';
import { Lightbox, type LightboxImage } from './Lightbox';
import { useTelegram } from '../lib/telegram';
import { cn } from '../lib/utils';
import { SPRING_CONFIG } from '../lib/constants';

interface ImageGalleryProps {
  images: LightboxImage[];
  className?: string;
}

/**
 * Responsive image grid whose tiles expand into a full-screen Lightbox on tap.
 *
 * Each thumbnail is rendered with `layoutId={`lightbox-${image.id}`}`, which
 * matches the `layoutId` used inside <Lightbox/>. Framer Motion uses that
 * shared id to morph the thumbnail into the full-screen image (and back on
 * close), so the transition feels continuous rather than a pop-in overlay.
 *
 * Layout:
 *  - 1 image  → single full-width tile
 *  - 2 images → two tiles side by side
 *  - 3+ images → 2-col grid on mobile, 3-col on sm+ breakpoints
 */
export function ImageGallery({ images, className }: ImageGalleryProps) {
  const [selected, setSelected] = useState<LightboxImage | null>(null);
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(new Set());
  const { haptic } = useTelegram();

  const handleImgError = useCallback((src: string) => {
    setFailedSrcs((prev) => new Set(prev).add(src));
  }, []);

  if (images.length === 0) return null;

  const handleOpen = (image: LightboxImage) => {
    if (failedSrcs.has(image.src)) return;
    haptic.medium();
    setSelected(image);
  };

  const handleClose = () => setSelected(null);

  return (
    <>
      <div
        className={cn(
          'grid gap-3',
          images.length === 1 && 'grid-cols-1',
          images.length === 2 && 'grid-cols-2',
          images.length >= 3 && 'grid-cols-2 sm:grid-cols-3',
          className,
        )}
      >
        {images.map((image, index) => {
          const isFailed = failedSrcs.has(image.src);

          return (
            <motion.button
              key={image.id}
              type="button"
              layoutId={`lightbox-${image.id}`}
              onClick={() => handleOpen(image)}
              className={cn(
                'group relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border/60 bg-muted text-left focus:outline-none focus:ring-2 focus:ring-ring/30 focus:ring-offset-2 focus:ring-offset-background ',
                isFailed && 'cursor-default',
              )}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING_CONFIG, delay: index * 0.05 }}
              whileTap={isFailed ? undefined : { scale: 0.97 }}
              aria-label={image.label ? `Open ${image.label}` : 'Open image'}
            >
              {isFailed ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <ImageOff className="h-8 w-8 opacity-40" />
                  <span className="text-[10px] opacity-60">Unavailable</span>
                </div>
              ) : (
                <img
                  src={image.src}
                  alt={image.label ?? ''}
                  loading="lazy"
                  draggable={false}
                  onError={() => handleImgError(image.src)}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              )}

              {/* Gradient scrim so the label stays legible on bright photos */}
              {!isFailed && (
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              )}

              {/* Expand affordance */}
              {!isFailed && (
                <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors group-hover:bg-black/70">
                  <Maximize2 className="h-3.5 w-3.5" />
                </div>
              )}

              {/* Label */}
              {image.label && (
                <div className={cn(
                  'absolute inset-x-0 bottom-0 px-3 pb-2 pt-6',
                  isFailed && 'pt-0',
                )}>
                  <div className={cn(
                    'truncate text-xs font-medium',
                    isFailed ? 'text-muted-foreground' : 'text-white',
                  )}>
                    {image.label}
                  </div>
                  {image.caption && (
                    <div className={cn(
                      'truncate text-[10px]',
                      isFailed ? 'text-muted-foreground/60' : 'text-white/70',
                    )}>
                      {image.caption}
                    </div>
                  )}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <Lightbox image={selected} onClose={handleClose} />
    </>
  );
}
