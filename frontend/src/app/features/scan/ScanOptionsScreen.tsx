import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useTelegram } from '../../lib/telegram';
import { useLocale } from '../../lib/i18n';
import { useScan } from './ScanContext';
import { Camera, Image, ArrowLeft, Sun, Focus, Maximize, EyeOff, Leaf, ChevronRight } from 'lucide-react';
import { useRef } from 'react';

export const ScanOptionsScreen = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { t } = useLocale();
  const { setImage } = useScan();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBack = () => {
    haptic.light();
    navigate('/home');
  };

  const handleCamera = () => {
    haptic.medium();
    navigate('/capture');
  };

  const handleGallery = () => {
    haptic.light();
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      haptic.success();
      setImage(file);
      navigate('/preview');
    }
  };

  const tips = [
    { icon: Sun, text: t('scan.tipLight'), desc: t('scan.tipLightDesc') },
    { icon: Focus, text: t('scan.tipFocus'), desc: t('scan.tipFocusDesc') },
    { icon: Maximize, text: t('scan.tipFull'), desc: t('scan.tipFullDesc') },
    { icon: EyeOff, text: t('scan.tipShadow'), desc: t('scan.tipShadowDesc') },
  ];

  return (
    <div className="min-h-screen-safe bg-background flex flex-col select-none">
      {/* Header */}
      <div className="px-6 pt-safe pb-4">
        <motion.button
          onClick={handleBack}
          className="flex items-center gap-2 text-foreground hover:text-foreground/80 transition-colors"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">{t('scan.title')}</span>
        </motion.button>
      </div>

      {/* Hero area */}
      <div className="flex-1 flex flex-col px-6">
        {/* Illustration + heading */}
        <motion.div
          className="flex flex-col items-center pt-2 pb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-3xl bg-primary/8 flex items-center justify-center">
              <Leaf className="w-10 h-10 text-primary" />
            </div>
            <motion.div
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
            >
              <Camera className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">{t('scan.heading')}</h2>
          <p className="text-[13px] text-muted-foreground text-center max-w-[240px] leading-relaxed">
            {t('scan.desc')}
          </p>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          className="rounded-xl border border-border bg-card overflow-hidden mb-5"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <motion.button
            onClick={handleCamera}
            className="flex items-center gap-4 w-full px-4 py-4 active:bg-muted/50 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[15px] font-medium text-foreground">{t('scan.camera')}</div>
              <div className="text-[12px] text-muted-foreground">{t('scan.cameraDesc')}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          </motion.button>

          <div className="h-px bg-border ml-[4.75rem]" />

          <motion.button
            onClick={handleGallery}
            className="flex items-center gap-4 w-full px-4 py-4 active:bg-muted/50 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Image className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[15px] font-medium text-foreground">{t('scan.gallery')}</div>
              <div className="text-[12px] text-muted-foreground">{t('scan.galleryDesc')}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          </motion.button>
        </motion.div>

        {/* Tips */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2.5">
            {t('scan.tipsTitle')}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {tips.map((tip, i) => (
              <motion.div
                key={i}
                className="flex flex-col gap-2 px-3.5 py-3.5 rounded-xl border border-border bg-card"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                  <tip.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-[13px] font-medium text-foreground leading-tight">{tip.text}</div>
                  <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{tip.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};
