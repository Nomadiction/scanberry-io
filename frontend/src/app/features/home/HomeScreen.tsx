import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../../ui/Card';
import { AnalysisCard } from '../../ui/AnalysisCard';
import { useTelegram } from '../../lib/telegram';
import { useAnalyses } from '../../api/hooks';
import { useLocale } from '../../lib/i18n';
import { SPRING_CONFIG, BASE_DELAY, STAGGER_DELAY, STATUS_SEVERITY } from '../../lib/constants';
import { Camera, History, Leaf, Settings, Activity, Heart, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCountUp } from '../../lib/hooks';
import { SettingsSheet } from '../settings/SettingsSheet';

export const HomeScreen = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { data } = useAnalyses();
  const { t } = useLocale();

  const analyses = data?.analyses ?? [];

  const stats = useMemo(() => {
    const total = analyses.length;
    if (total === 0) return { total: 0, healthRate: 0, avgHealth: 0 };
    const healthy = analyses.filter(a => a.health_class === 'healthy').length;
    const avgHealth = analyses.reduce((sum, a) => {
      const w = STATUS_SEVERITY[a.health_class].score;
      const c = a.confidence;
      return sum + Math.round(w * (c / 100) + w * (1 - c / 100) * 0.5);
    }, 0) / total;
    return {
      total,
      healthRate: Math.round(healthy / total * 100),
      avgHealth: Number(avgHealth.toFixed(1)),
    };
  }, [analyses]);

  const recentAnalyses = analyses.slice(0, 3);
  const [showSettings, setShowSettings] = useState(false);

  const animTotal = useCountUp(stats.total, 600, 200);
  const animHealthRate = useCountUp(stats.healthRate, 800, 300);
  const animAvgHealth = useCountUp(stats.avgHealth, 800, 400);

  const handleScan = () => {
    haptic.light();
    navigate('/scan');
  };

  const handleViewHistory = () => {
    haptic.light();
    navigate('/history');
  };

  const handleViewAnalysis = (id: string) => {
    haptic.light();
    navigate(`/result/${id}`);
  };

  const handleOpenSettings = () => {
    haptic.light();
    setShowSettings(true);
  };

  return (
    <div className="min-h-screen-safe bg-background pb-safe flex flex-col select-none">
      {/* Header */}
      <div className="px-6 pt-safe pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING_CONFIG}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl leading-tight">ScanBerry</h1>
              <p className="text-xs text-muted-foreground">{t('home.subtitle')}</p>
            </div>
          </div>
          <motion.button
            onClick={handleOpenSettings}
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            whileTap={{ scale: 0.95 }}
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </motion.button>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-3 gap-2.5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: BASE_DELAY }}
        >
          {[
            { icon: Activity, label: t('home.scans'), value: String(Math.round(animTotal)), color: 'text-primary', accent: 'var(--primary)' },
            { icon: Heart, label: t('home.healthy'), value: `${Math.round(animHealthRate)}%`, color: 'text-primary', accent: 'var(--primary)' },
            { icon: Target, label: t('home.avgHealth'), value: `${animAvgHealth.toFixed(1)}%`, color: 'text-primary', accent: 'var(--primary)' },
          ].map((stat, i) => (
            <Card key={stat.label} className="overflow-hidden">
              <CardContent className="p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `color-mix(in srgb, ${stat.accent} 12%, transparent)` }}
                  >
                    <stat.icon className={`w-3 h-3 ${stat.color}`} />
                  </div>
                </div>
                <motion.div
                  className={`text-xl font-mono font-semibold ${stat.color} leading-tight mb-0.5`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: BASE_DELAY + i * 0.1 }}
                >
                  {stat.value}
                </motion.div>
                <span className="text-[10px] text-muted-foreground font-medium">{stat.label}</span>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      </div>

      {/* Main CTA */}
      <motion.div
        className="my-5 flex flex-col items-center gap-3"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: BASE_DELAY * 2 }}
      >
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.button
            onClick={handleScan}
            className="relative w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            aria-label="Scan plant"
          >
            <Camera className="w-5 h-5" />
          </motion.button>
        </div>
        <span className="text-[11px] text-muted-foreground font-medium">
          {t('home.tapToScan')}
        </span>
      </motion.div>

      {/* Recent Analyses */}
      <div className="px-6 flex-1 flex flex-col">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: BASE_DELAY * 3 }}
        >
          {recentAnalyses.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-semibold text-foreground/80 uppercase tracking-wide">{t('home.recent')}</h2>
                <button
                  onClick={handleViewHistory}
                  className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-medium"
                >
                  {t('home.viewAll')}
                  <History className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3">
                {recentAnalyses.map((analysis, index) => (
                  <AnalysisCard
                    key={analysis.id}
                    id={analysis.id}
                    healthClass={analysis.health_class}
                    confidence={analysis.confidence}
                    damagePercentage={analysis.damage_percentage}
                    createdAt={analysis.created_at}
                    onClick={() => handleViewAnalysis(analysis.id)}
                    delay={BASE_DELAY * 4 + index * STAGGER_DELAY}
                  />
                ))}
              </div>
            </>
          ) : (
            <motion.div
              className="rounded-xl border border-border bg-card p-8 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: BASE_DELAY * 3 }}
            >
              <Leaf className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground/70 mb-1">{t('home.noAnalyses')}</p>
              <p className="text-xs text-muted-foreground">
                {t('home.noAnalysesDesc')}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      <SettingsSheet isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};
