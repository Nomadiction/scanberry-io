import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';
import { useTheme } from '../../providers/ThemeProvider';
import { useLocale } from '../../lib/i18n';
import { useTelegram } from '../../lib/telegram';
import { SPRING_CONFIG } from '../../lib/constants';
import { X, Sun, Moon, Monitor } from 'lucide-react';
import type { Locale } from '../../lib/i18n';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsSheet = ({ isOpen, onClose }: SettingsSheetProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const { haptic } = useTelegram();

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    haptic.light();
    setTheme(newTheme);
  };

  const handleLocaleChange = (newLocale: Locale) => {
    haptic.light();
    setLocale(newLocale);
  };

  const handleClose = () => {
    haptic.light();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[51] max-h-[80vh] overflow-y-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING_CONFIG}
            role="dialog"
            aria-label="Settings"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <h2 className="text-lg font-semibold">{t('settings.title')}</h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                aria-label="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Theme Selection */}
              <div>
                <div className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
                  {t('settings.theme')}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'light' as const, icon: Sun, labelKey: 'settings.light' as const },
                    { value: 'dark' as const, icon: Moon, labelKey: 'settings.dark' as const },
                    { value: 'system' as const, icon: Monitor, labelKey: 'settings.system' as const },
                  ].map(({ value, icon: Icon, labelKey }) => {
                    const isActive = theme === value;
                    return (
                      <button
                        key={value}
                        onClick={() => handleThemeChange(value)}
                        aria-label={t(labelKey)}
                        aria-pressed={isActive}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all active:scale-[0.97] ${
                          isActive
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <span className={`text-xs ${
                          isActive ? 'font-medium text-primary' : 'text-muted-foreground'
                        }`}>
                          {t(labelKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <div className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
                  {t('settings.language')}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'en' as const, label: 'English' },
                    { value: 'ru' as const, label: 'Русский' },
                    { value: 'es' as const, label: 'Español' },
                    { value: 'de' as const, label: 'Deutsch' },
                  ].map(({ value, label }) => {
                    const isActive = locale === value;
                    return (
                      <button
                        key={value}
                        onClick={() => handleLocaleChange(value)}
                        aria-label={label}
                        aria-pressed={isActive}
                        className={`flex items-center justify-center py-3 rounded-xl border transition-all active:scale-[0.97] ${
                          isActive
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card'
                        }`}
                      >
                        <span className={`text-xs ${
                          isActive ? 'font-medium text-primary' : 'text-muted-foreground'
                        }`}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* About */}
              <div>
                <div className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
                  {t('settings.about')}
                </div>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('settings.aboutText')}
                    </p>
                  </div>
                  {[
                    { labelKey: 'settings.version' as const, value: '2.6.7' },
                    { labelKey: 'settings.detection' as const, value: 'YOLOv8s' },
                    { labelKey: 'settings.classification' as const, value: 'EfficientNet-B0' },
                    { labelKey: 'settings.segmentation' as const, value: 'U-Net / ResNet18' },
                  ].map((item) => (
                    <div key={item.labelKey} className="flex justify-between items-center px-4 py-2.5 text-xs border-t border-border">
                      <span className="text-muted-foreground">{t(item.labelKey)}</span>
                      <span className="font-mono font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Safe area padding for iOS */}
            <div className="pb-safe" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
