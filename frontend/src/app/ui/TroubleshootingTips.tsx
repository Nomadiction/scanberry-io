import { AlertCircle } from 'lucide-react';
import { useLocale } from '../lib/i18n';
import type { TranslationKey } from '../lib/i18n';

interface TroubleshootingTipsProps {
  issue: 'camera' | 'permissions';
}

const TIP_KEYS: Record<'camera' | 'permissions', TranslationKey[]> = {
  camera: [
    'troubleshoot.camera.1',
    'troubleshoot.camera.2',
    'troubleshoot.camera.3',
    'troubleshoot.camera.4',
    'troubleshoot.camera.5',
  ],
  permissions: [
    'troubleshoot.perm.1',
    'troubleshoot.perm.2',
    'troubleshoot.perm.3',
    'troubleshoot.perm.4',
    'troubleshoot.perm.5',
  ],
};

export const TroubleshootingTips = ({ issue }: TroubleshootingTipsProps) => {
  const { t } = useLocale();
  return (
    <div className="rounded-lg bg-muted/50 p-4 text-left">
      <div className="flex gap-2 mb-2">
        <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <h4 className="text-xs font-medium">{t('troubleshoot.title')}</h4>
      </div>
      <ul className="text-xs text-muted-foreground space-y-1.5 ml-6">
        {TIP_KEYS[issue].map((key) => (
          <li key={key}>• {t(key)}</li>
        ))}
      </ul>
    </div>
  );
};
