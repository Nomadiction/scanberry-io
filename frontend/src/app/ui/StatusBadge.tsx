import { HealthClass } from '../types/analysis';
import { STATUS_COLORS } from '../lib/constants';
import { useLocale } from '../lib/i18n';
import { cn } from '../lib/utils';
import type { TranslationKey } from '../lib/i18n';

interface StatusBadgeProps {
  healthClass: HealthClass;
  className?: string;
}

const STATUS_STYLES: Record<HealthClass, string> = {
  healthy: 'bg-status-healthy/10 text-status-healthy border-status-healthy/20',
  stress: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20',
  mold: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20',
  dry: 'bg-status-dry/10 text-status-dry border-status-dry/20',
};

const STATUS_LABEL_KEYS: Record<HealthClass, TranslationKey> = {
  healthy: 'status.healthy',
  stress: 'status.stress',
  mold: 'status.mold',
  dry: 'status.dry',
};

export const StatusBadge = ({ healthClass, className }: StatusBadgeProps) => {
  const color = STATUS_COLORS[healthClass];
  const { t } = useLocale();
  const label = t(STATUS_LABEL_KEYS[healthClass]);
  const style = STATUS_STYLES[healthClass];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[11px] font-medium',
        style,
        className
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
};
