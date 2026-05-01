import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useTelegram } from '../../lib/telegram';
import { useLocale } from '../../lib/i18n';
import { useScan } from './ScanContext';
import { useUploadAnalysis } from '../../api/hooks';
import { Brain, CheckCircle2, Loader2, ScanSearch, Microscope, Layers, BarChart3 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { TranslationKey } from '../../lib/i18n';

const STEP_KEYS: TranslationKey[] = [
  'loading.step1',
  'loading.step2',
  'loading.step3',
  'loading.step4',
];

const STEP_ICONS: LucideIcon[] = [ScanSearch, Microscope, Layers, BarChart3];

/** Time (ms) each cosmetic step stays in "active" state before moving on. */
const STEP_DURATIONS = [2500, 3500, 4500, 3000];

export const AnalysisLoadingScreen = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { t } = useLocale();
  const { file, previewUrl, clear } = useScan();
  const upload = useUploadAnalysis();
  const [currentStep, setCurrentStep] = useState(0);
  const startedRef = useRef(false);
  const doneRef = useRef(false);

  const hapticRef = useRef(haptic);
  hapticRef.current = haptic;
  const clearRef = useRef(clear);
  clearRef.current = clear;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const [scanY, setScanY] = useState(0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (doneRef.current) return;
    if (!file) {
      navigateRef.current('/scan', { replace: true });
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    upload.mutate(file, {
      onSuccess: (result) => {
        doneRef.current = true;
        hapticRef.current.success();
        clearRef.current();
        navigateRef.current(`/result/${result.id}`, { replace: true });
      },
      onError: () => {
        doneRef.current = true;
        hapticRef.current.error();
        navigateRef.current('/scan', { replace: true });
      },
    });
  }, [file, upload]);

  useEffect(() => {
    let totalTime = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    STEP_KEYS.forEach((_, index) => {
      const dur = STEP_DURATIONS[index] ?? 3000;
      totalTime += dur;
      if (index < STEP_KEYS.length - 1) {
        timeouts.push(
          setTimeout(() => {
            setCurrentStep(index + 1);
            if (index === 0) hapticRef.current.light();
          }, totalTime),
        );
      } else {
        timeouts.push(
          setTimeout(() => {
            setCurrentStep(index);
            hapticRef.current.light();
          }, totalTime - dur),
        );
      }
    });

    return () => timeouts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const duration = 2000;

    const tick = (ts: number) => {
      if (document.hidden) {
        start = null;
        raf = requestAnimationFrame(tick);
        return;
      }
      if (start === null) start = ts;
      const progress = ((ts - start) % duration) / duration;
      setScanY(progress * 100);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const currentStepLabel = t(STEP_KEYS[Math.min(currentStep, STEP_KEYS.length - 1)]!);
  const statusMessage = upload.isPending
    ? `${currentStepLabel}...`
    : upload.isError
      ? t('loading.failed')
      : t('loading.finalizing');

  return (
    <div className="min-h-screen-safe bg-background flex flex-col items-center justify-center p-6 pb-safe select-none">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {previewUrl && !imgError ? (
          <div className="relative w-48 h-48 mx-auto mb-8 rounded-2xl overflow-hidden border border-border">
            <img
              src={previewUrl}
              alt="Scanning"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
            <motion.div
              className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_2px] shadow-primary/50"
              style={{ top: `${scanY}%` }}
            />
            <div
              className="absolute left-0 right-0 h-12 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none"
              style={{ top: `${Math.max(0, scanY - 6)}%` }}
            />
          </div>
        ) : (
          <motion.div
            className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-primary/10 flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Brain className="w-10 h-10 text-primary" />
          </motion.div>
        )}

        <h2 className="text-center text-lg font-semibold mb-1.5">
          {t('loading.title')}
        </h2>
        <p className="text-center text-[13px] text-muted-foreground mb-8">
          {t('loading.subtitle')}
        </p>

        <div className="space-y-4 mb-8">
          {STEP_KEYS.map((key, index) => {
            const isComplete = currentStep > index;
            const isCurrent = currentStep === index;
            const StepIcon = STEP_ICONS[index]!;

            return (
              <motion.div
                key={key}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex-shrink-0">
                  {isComplete ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </motion.div>
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-border" />
                  )}
                </div>
                <StepIcon className={`w-4 h-4 flex-shrink-0 ${
                  isComplete || isCurrent ? 'text-foreground' : 'text-muted-foreground/50'
                }`} />
                <span
                  className={`text-sm ${
                    isComplete || isCurrent
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  {t(key)}
                </span>
              </motion.div>
            );
          })}
        </div>

        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ x: '-100%', width: '40%' }}
            animate={{ x: '250%' }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="mt-6 text-center">
          <span className="font-mono text-xs text-muted-foreground">
            {statusMessage}
          </span>
        </div>
      </motion.div>
    </div>
  );
};
