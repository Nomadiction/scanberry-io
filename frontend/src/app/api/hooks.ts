import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analysisApi } from './analysis';
import type { HealthClass } from '../types/analysis';

export const analysisKeys = {
  all: ['analyses'] as const,
  lists: () => [...analysisKeys.all, 'list'] as const,
  list: (filters: { health_class?: HealthClass | 'all' }) =>
    [...analysisKeys.lists(), filters] as const,
  details: () => [...analysisKeys.all, 'detail'] as const,
  detail: (id: string) => [...analysisKeys.details(), id] as const,
};

export const useAnalyses = (health_class?: HealthClass | 'all') => {
  // Always fetch unfiltered — backend has NULL health_class for records where
  // classification didn't run, but the frontend mapper defaults those to
  // 'healthy'. Filtering server-side would miss them.
  const query = useQuery({
    queryKey: analysisKeys.list({ health_class: 'all' }),
    queryFn: () => analysisApi.getAnalyses(),
  });

  if (!health_class || health_class === 'all' || !query.data) return query;

  const filtered = query.data.analyses.filter(
    (a) => a.health_class === health_class,
  );
  return {
    ...query,
    data: { ...query.data, analyses: filtered, total: filtered.length },
  };
};

export const useAnalysis = (id: string) => {
  return useQuery({
    queryKey: analysisKeys.detail(id),
    queryFn: () => analysisApi.getAnalysis(id),
    enabled: Boolean(id),
  });
};

export const useUploadAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => analysisApi.uploadImage(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analysisKeys.lists() });
    },
  });
};

export const useDeleteAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => analysisApi.deleteAnalysis(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: analysisKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: analysisKeys.all });
    },
  });
};
