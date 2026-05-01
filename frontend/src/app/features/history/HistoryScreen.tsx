import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { AnalysisCard } from '../../ui/AnalysisCard';
import { SwipeableRow } from '../../ui/SwipeableRow';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonCard } from '../../ui/Skeleton';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useTelegram } from '../../lib/telegram';
import { useAnalyses, useDeleteAnalysis } from '../../api/hooks';
import { useLocale } from '../../lib/i18n';
import { useFavorites } from '../../lib/hooks';
import { formatDate } from '../../lib/utils';
import { STATUS_LABELS, STAGGER_DELAY } from '../../lib/constants';
import { ArrowLeft, Search, Inbox, Camera, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { HealthClass } from '../../types/analysis';
import type { TranslationKey } from '../../lib/i18n';

const HEALTH_FILTERS = ['all', 'healthy', 'stress', 'mold', 'dry'] as const;

const STATUS_LABEL_KEYS: Record<HealthClass, TranslationKey> = {
  healthy: 'status.healthy',
  stress: 'status.stress',
  mold: 'status.mold',
  dry: 'status.dry',
};

export const HistoryScreen = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { t } = useLocale();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const deleteMutation = useDeleteAnalysis();

  const [filter, setFilter] = useState<HealthClass | 'all'>('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { data, isLoading } = useAnalyses(filter);

  const analyses = data?.analyses ?? [];

  const filteredAnalyses = useMemo(() => {
    let list = analyses;

    if (showFavorites) {
      list = list.filter((a) => isFavorite(a.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => {
        const label = STATUS_LABELS[a.health_class].toLowerCase();
        const date = formatDate(a.created_at).toLowerCase();
        return label.includes(q) || date.includes(q) || a.id.includes(q);
      });
    }

    return list;
  }, [analyses, searchQuery, showFavorites, isFavorite]);

  const handleBack = () => {
    haptic.light();
    navigate('/home');
  };

  const handleViewAnalysis = (id: string) => {
    haptic.light();
    navigate(`/result/${id}`);
  };

  const handleFilterChange = (newFilter: HealthClass | 'all') => {
    haptic.light();
    setFilter(newFilter);
    setShowFavorites(false);
  };

  const handleToggleFavorites = () => {
    haptic.light();
    setShowFavorites((prev) => !prev);
    if (!showFavorites) setFilter('all');
  };

  const handleToggleFavorite = (id: string) => {
    haptic.light();
    toggleFavorite(id);
  };

  const handleDeleteRequest = (id: string) => {
    haptic.medium();
    setDeleteTarget(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      haptic.success();
      setDeleteTarget(null);
    } catch {
      haptic.error();
    }
  };

  const handleStartScan = () => {
    haptic.medium();
    navigate('/scan');
  };

  const { data: allData } = useAnalyses('all');
  const totalAnalyses = allData?.analyses?.length ?? 0;
  const hasNoAnalysesAtAll = !isLoading && totalAnalyses === 0;

  return (
    <div className="min-h-screen-safe bg-background pb-safe select-none">
      {/* Header */}
      <div className="px-6 pt-safe pb-4">
        <motion.button
          onClick={handleBack}
          className="flex items-center gap-2 text-foreground hover:text-foreground/80 transition-colors mb-5"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">{t('history.title')}</span>
        </motion.button>

        {!hasNoAnalysesAtAll && !isLoading && (
          <>
            {/* Search */}
            <motion.div
              className="relative mb-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('history.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search analyses"
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 border border-border/60 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-all select-text"
              />
            </motion.div>

            {/* Filters */}
            <motion.div
              className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Favorites button */}
              <button
                onClick={handleToggleFavorites}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                  showFavorites
                    ? 'bg-amber-400 text-white'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                <Star className={`w-3 h-3 ${showFavorites ? 'fill-white' : ''}`} />
                {t('history.favorites')}
              </button>

              {HEALTH_FILTERS.map((f) => {
                const isActive = filter === f && !showFavorites;
                return (
                  <button
                    key={f}
                    onClick={() => handleFilterChange(f)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {f === 'all' ? t('history.all') : t(STATUS_LABEL_KEYS[f])}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="px-6 space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : hasNoAnalysesAtAll ? (
        <EmptyState
          icon={Camera}
          title={t('history.noAnalyses')}
          description={t('history.noAnalysesDesc')}
          actionLabel={t('history.startFirst')}
          onAction={handleStartScan}
        />
      ) : (
        <>
          {/* Results Count */}
          <div className="px-6 mb-3">
            <p className="text-xs text-muted-foreground font-medium">
              {filteredAnalyses.length} {filteredAnalyses.length === 1 ? t('history.result') : t('history.results')}
            </p>
          </div>

          {/* List */}
          <div className="px-6 pb-4">
            {filteredAnalyses.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={t('history.noResults')}
                description={t('history.noResultsDesc')}
              />
            ) : (
              <div className="space-y-2.5">
                {filteredAnalyses.map((analysis, index) => (
                  <SwipeableRow
                    key={analysis.id}
                    isFavorite={isFavorite(analysis.id)}
                    onToggleFavorite={() => handleToggleFavorite(analysis.id)}
                    onDelete={() => handleDeleteRequest(analysis.id)}
                  >
                    <AnalysisCard
                      id={analysis.id}
                      healthClass={analysis.health_class}
                      confidence={analysis.confidence}
                      damagePercentage={analysis.damage_percentage}
                      processingTimeMs={analysis.processing_time_ms}
                      createdAt={analysis.created_at}
                      onClick={() => handleViewAnalysis(analysis.id)}
                      delay={index * STAGGER_DELAY}
                      isFavorite={isFavorite(analysis.id)}
                    />
                  </SwipeableRow>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('confirm.deleteTitle')}
        description={t('confirm.deleteDesc')}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.keep')}
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => !deleteMutation.isPending && setDeleteTarget(null)}
      />
    </div>
  );
};
