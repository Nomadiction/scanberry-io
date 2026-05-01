import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SPRING_CONFIG } from '../lib/constants';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const [mounted, setMounted] = useState(false);
  const savedScrollY = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      savedScrollY.current = window.scrollY;
      window.scrollTo(0, 0);
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
        window.scrollTo(0, savedScrollY.current);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || loading) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, loading, onCancel]);

  const confirmVariant = variant === 'danger' ? 'danger' : 'primary';

  const dialog = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={loading ? undefined : onCancel}
            aria-hidden
          />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="fixed left-1/2 top-1/2 z-[101] w-[min(340px,calc(100vw-2rem))]"
            initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
            transition={SPRING_CONFIG}
          >
            <div
              className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <h3 id="confirm-title" className="text-base font-semibold text-foreground">
                  {title}
                </h3>
                {description && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="w-full rounded-xl"
                  disabled={loading}
                  onClick={onCancel}
                >
                  {cancelLabel}
                </Button>
                <Button
                  type="button"
                  variant={confirmVariant}
                  size="lg"
                  className="w-full rounded-xl"
                  loading={loading}
                  disabled={loading}
                  onClick={onConfirm}
                >
                  {confirmLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(dialog, document.body);
};
