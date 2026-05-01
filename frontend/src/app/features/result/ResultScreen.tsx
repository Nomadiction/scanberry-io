import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../ui/Button';
import { Card, CardContent, CardHeader } from '../../ui/Card';
import { CircularGauge } from '../../ui/CircularGauge';
import { StatusBadge } from '../../ui/StatusBadge';
import { EmptyState } from '../../ui/EmptyState';
import { ImageGallery } from '../../ui/ImageGallery';
import type { LightboxImage } from '../../ui/Lightbox';
import { useTelegram } from '../../lib/telegram';
import { useLocale } from '../../lib/i18n';
import { useAnalysis, useDeleteAnalysis } from '../../api/hooks';
import { useCountUp } from '../../lib/hooks';
import { STATUS_COLORS, STATUS_SEVERITY } from '../../lib/constants';
import { formatDate, formatDuration } from '../../lib/utils';
import { shareOrCopyLink } from '../../lib/share';
import { BASE_DELAY, STAGGER_DELAY } from '../../lib/constants';
import { ArrowLeft, Share2, AlertCircle, Info, Loader2, Clock, Hash, Cpu, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { HealthClass } from '../../types/analysis';
import type { TranslationKey } from '../../lib/i18n';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

const HEALTH_CLASSES: HealthClass[] = ['healthy', 'stress', 'mold', 'dry'];

const STATUS_LABEL_KEYS: Record<HealthClass, TranslationKey> = {
  healthy: 'status.healthy',
  stress: 'status.stress',
  mold: 'status.mold',
  dry: 'status.dry',
};

const STATUS_DESC_KEYS: Record<HealthClass, TranslationKey> = {
  healthy: 'status.healthy.desc',
  stress: 'status.stress.desc',
  mold: 'status.mold.desc',
  dry: 'status.dry.desc',
};

const NEXT_STEP_KEYS: Record<HealthClass, TranslationKey[]> = {
  healthy: ['steps.healthy.1', 'steps.healthy.2', 'steps.healthy.3'],
  stress: ['steps.stress.1', 'steps.stress.2', 'steps.stress.3', 'steps.stress.4'],
  mold: ['steps.mold.1', 'steps.mold.2', 'steps.mold.3', 'steps.mold.4', 'steps.mold.5'],
  dry: ['steps.dry.1', 'steps.dry.2', 'steps.dry.3', 'steps.dry.4', 'steps.dry.5'],
};

export const ResultScreen = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { t } = useLocale();
  const { data: analysis, isLoading, isError } = useAnalysis(id ?? '');
  const deleteMutation = useDeleteAnalysis();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const healthScore = useMemo(() => {
    if (!analysis) return 0;
    const severity = STATUS_SEVERITY[analysis.health_class];
    const classWeight = severity.score;
    const conf = analysis.confidence;
    return Math.round(classWeight * (conf / 100) + classWeight * (1 - conf / 100) * 0.5);
  }, [analysis]);

  const healthScoreAnim = useCountUp(healthScore, 1000, 400);
  const damageAnim = useCountUp(analysis?.damage_percentage ?? 0, 1000, 600);

  const confidenceInfo = useMemo(() => {
    const confidence = analysis?.confidence ?? 0;
    if (confidence >= 75) return { text: t('confidence.high'), color: '#10B981' };
    if (confidence >= 50) return { text: t('confidence.moderate'), color: '#F59E0B' };
    return { text: t('confidence.low'), color: '#EF4444' };
  }, [analysis, t]);

  const probabilities = useMemo(() => {
    if (!analysis) return {} as Record<HealthClass, number>;
    if (analysis.class_probabilities) {
      return { ...analysis.class_probabilities } as Record<HealthClass, number>;
    }
    const conf = analysis.confidence;
    const remaining = Math.max(0, 100 - conf);
    const otherCount = HEALTH_CLASSES.length - 1;
    return Object.fromEntries(
      HEALTH_CLASSES.map((cls) => [
        cls,
        cls === analysis.health_class ? conf : remaining / otherCount,
      ]),
    ) as Record<HealthClass, number>;
  }, [analysis]);

  const galleryImages = useMemo<LightboxImage[]>(() => {
    if (!analysis) return [];
    const items: LightboxImage[] = [];
    if (analysis.visualization_url) {
      items.push({ id: `vis-${analysis.id}`, src: analysis.visualization_url, label: t('result.aiAnalysis'), caption: t('result.detectionOverlay') });
    }
    if (analysis.image_url) {
      items.push({ id: `orig-${analysis.id}`, src: analysis.image_url, label: t('result.originalPhoto'), caption: analysis.original_filename ?? t('result.uploadedImage') });
    }
    if (analysis.segmentation_available && analysis.mask_url) {
      items.push({ id: `mask-${analysis.id}`, src: analysis.mask_url, label: t('result.segmentationMask'), caption: t('result.pixelDamageMap') });
    }
    return items;
  }, [analysis, t]);

  if (isLoading) {
    return (
      <div className="min-h-screen-safe bg-background flex items-center justify-center pb-safe">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isError || !analysis) {
    return (
      <div className="min-h-screen-safe bg-background flex items-center justify-center p-6 pb-safe">
        <EmptyState
          icon={AlertCircle}
          title={t('result.notFound')}
          description={t('result.notFoundDesc')}
          actionLabel={t('result.backHome')}
          onAction={() => navigate('/home')}
        />
      </div>
    );
  }

  const handleBack = () => {
    haptic.light();
    navigate(-1);
  };

  const handleShare = async () => {
    haptic.medium();
    const outcome = await shareOrCopyLink({
      url: typeof window !== 'undefined' ? window.location.href : '',
      title: `ScanBerry — ${t(STATUS_LABEL_KEYS[analysis.health_class])}`,
      text: `${t(STATUS_LABEL_KEYS[analysis.health_class])} — Health Score ${healthScore}`,
    });
    if (outcome === 'shared' || outcome === 'copied') haptic.success();
  };

  const handleDeleteRequest = () => {
    haptic.medium();
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
      haptic.success();
      setConfirmOpen(false);
      navigate('/history', { replace: true });
    } catch {
      haptic.error();
    }
  };

  return (
    <div className="min-h-screen-safe bg-background pb-safe select-none">
      {/* Header */}
      <div className="px-6 pt-safe pb-4 flex items-center justify-between">
        <motion.button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-foreground hover:text-foreground/80 transition-colors"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">{t('result.title')}</span>
        </motion.button>
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={handleShare}
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Share results"
          >
            <Share2 className="w-4 h-4" />
          </motion.button>
          <motion.button
            type="button"
            onClick={handleDeleteRequest}
            className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Delete analysis"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      <div className="px-6 space-y-3">
        {/* Status Card with gauges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: BASE_DELAY }}
        >
          <Card className="overflow-hidden">
            <div>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between mb-2">
                  <StatusBadge healthClass={analysis.health_class} />
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(analysis.created_at)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(STATUS_DESC_KEYS[analysis.health_class])}
                </p>
              </CardHeader>

              <CardContent className="pb-4 pt-1">
                <div className="flex justify-around">
                  <CircularGauge
                    value={healthScoreAnim}
                    color={STATUS_COLORS[analysis.health_class]}
                    label={t('result.healthScore')}
                  />
                  {analysis.damage_percentage > 0 && (
                    <CircularGauge
                      value={damageAnim}
                      color="#EF4444"
                      label={t('result.damageArea')}
                    />
                  )}
                </div>
                <div className="text-center mt-2">
                  <span className="text-[11px] font-medium" style={{ color: confidenceInfo.color }}>
                    {confidenceInfo.text}
                  </span>
                </div>
              </CardContent>
            </div>
          </Card>
        </motion.div>

        {/* Visual Evidence */}
        {galleryImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: BASE_DELAY * 1.5 }}
          >
            <div className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
              {t('result.visualEvidence')}
            </div>
            <ImageGallery images={galleryImages} />
          </motion.div>
        )}

        {/* Classification Probabilities */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: BASE_DELAY * 2 }}
        >
          <div>
            <div className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
              {t('result.probabilities')}
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              {HEALTH_CLASSES.map((cls, index) => {
                const probability = probabilities[cls] ?? 0;
                const isTop = cls === analysis.health_class;
                return (
                  <div key={cls}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[cls] }}
                        />
                        <span className={`text-sm ${isTop ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                          {t(STATUS_LABEL_KEYS[cls])}
                        </span>
                      </div>
                      <span className={`text-sm font-mono ${isTop ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground'}`}>
                        {probability.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[cls] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${probability}%` }}
                        transition={{
                          delay: BASE_DELAY * 2.5 + index * 0.1,
                          duration: 0.8,
                          ease: 'easeOut',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Damage Breakdown */}
        {analysis.damage_breakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: BASE_DELAY * 3 }}
          >
            <div>
              <div className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
                {t('result.damageBreakdown')}
              </div>
              <div className="rounded-xl border border-border bg-card p-4 space-y-3.5">
                {analysis.damage_breakdown.map((damage, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: damage.color }}
                        />
                        <span className="text-sm font-medium">{damage.lesion_type}</span>
                      </div>
                      <span className="text-sm font-mono font-semibold">
                        {damage.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: damage.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${damage.percentage}%` }}
                        transition={{
                          delay: BASE_DELAY * 3.5 + index * STAGGER_DELAY,
                          duration: 0.6,
                          ease: 'easeOut',
                        }}
                      />
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {damage.area_pixels.toLocaleString()} px
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Analysis Details */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: BASE_DELAY * 3.5 }}
        >
          <div className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
            {t('result.details')}
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{t('result.processingTime')}</span>
              </div>
              <span className="text-sm font-mono font-semibold">
                {formatDuration(analysis.processing_time_ms)}
              </span>
            </div>
            <div className="h-px bg-border mx-4" />
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                <Hash className="w-4 h-4" />
                <span className="text-sm">{t('result.analysisId')}</span>
              </div>
              <div className="text-[11px] font-mono font-medium text-foreground/60 break-all select-text bg-muted/30 rounded-lg px-2.5 py-1.5">
                {analysis.id}
              </div>
            </div>
            <div className="h-px bg-border mx-4" />
            <div className="flex items-center justify-between px-4 py-3 gap-2">
              <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                <Cpu className="w-4 h-4" />
                <span className="text-sm">{t('result.pipeline')}</span>
              </div>
              <span className="text-[10px] font-mono font-semibold text-right leading-tight">
                YOLOv8s + EfficientNet-B0
                <br />
                + DeepLabV3+ / U-Net
              </span>
            </div>
          </div>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: BASE_DELAY * 4 }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex gap-3">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-primary" />
            <div>
              <h4 className="text-sm font-semibold mb-2 text-primary">
                {t('result.recommendations')}
              </h4>
              <ul className="space-y-2">
                {NEXT_STEP_KEYS[analysis.health_class].map((key, i) => (
                  <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2.5">
                    <span className="text-primary font-bold mt-px flex-shrink-0 text-[10px]">{i + 1}.</span>
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: BASE_DELAY * 5 }}
          className="pt-2 pb-4"
        >
          <Button
            onClick={() => navigate('/scan')}
            className="w-full rounded-xl"
            size="lg"
          >
            {t('result.scanAnother')}
          </Button>
        </motion.div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={t('confirm.deleteTitle')}
        description={t('confirm.deleteDesc')}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.keep')}
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => !deleteMutation.isPending && setConfirmOpen(false)}
      />
    </div>
  );
};
