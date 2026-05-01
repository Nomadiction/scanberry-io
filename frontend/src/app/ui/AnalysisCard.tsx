import { useMemo } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Star } from 'lucide-react';
import { Card, CardContent } from './Card';
import { StatusBadge } from './StatusBadge';
import { STATUS_COLORS, STATUS_SEVERITY } from '../lib/constants';
import { useLocale } from '../lib/i18n';
import { formatDate } from '../lib/utils';
import type { HealthClass } from '../types/analysis';

interface AnalysisCardProps {
  id: string;
  healthClass: HealthClass;
  confidence: number;
  damagePercentage: number;
  processingTimeMs?: number;
  createdAt: string;
  onClick: () => void;
  delay?: number;
  isFavorite?: boolean;
}

export function AnalysisCard({
  id: _,
  healthClass,
  confidence,
  damagePercentage,
  processingTimeMs,
  createdAt,
  onClick,
  delay = 0,
  isFavorite,
}: AnalysisCardProps) {
  const color = STATUS_COLORS[healthClass];
  const { t } = useLocale();

  const healthScore = useMemo(() => {
    const classWeight = STATUS_SEVERITY[healthClass].score;
    const conf = confidence;
    return Math.round(classWeight * (conf / 100) + classWeight * (1 - conf / 100) * 0.5);
  }, [healthClass, confidence]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
    >
      <Card
        className="cursor-pointer active:scale-[0.985] transition-all overflow-hidden group hover:border-border/80"
        onClick={onClick}
      >
        <CardContent className="p-0">
          <div className="px-4 py-3">
            {/* Top row: badge + favorite indicator + date */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <StatusBadge healthClass={healthClass} />
                {isFavorite && (
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {formatDate(createdAt)}
              </span>
            </div>

            {/* Metrics row */}
            <div className="flex items-end gap-3">
              <div className="flex-1 flex items-end gap-5">
                <div className="min-w-0">
                  <div className="text-[10px] text-muted-foreground mb-0.5">{t('card.health')}</div>
                  <div className="text-[15px] font-mono font-semibold text-foreground leading-tight">
                    {healthScore}%
                  </div>
                </div>
                {damagePercentage > 0 && (
                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground mb-0.5">{t('card.damage')}</div>
                    <div className="text-[15px] font-mono font-semibold text-foreground leading-tight">
                      {damagePercentage.toFixed(1)}%
                    </div>
                  </div>
                )}
                {processingTimeMs != null && (
                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground mb-0.5">{t('card.time')}</div>
                    <div className="text-[15px] font-mono font-medium text-muted-foreground leading-tight">
                      {(processingTimeMs / 1000).toFixed(1)}s
                    </div>
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0 group-hover:text-muted-foreground/60 transition-colors mb-0.5" />
            </div>

            {/* Mini health bar */}
            <div className="mt-2.5 h-[3px] bg-muted/60 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(healthScore, 100)}%` }}
                transition={{ delay: delay + 0.3, duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
