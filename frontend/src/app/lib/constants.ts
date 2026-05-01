/**
 * Application constants and theme configurations
 */

import { HealthClass } from '../types/analysis';

/**
 * Status colors mapping
 */
export const STATUS_COLORS: Record<HealthClass, string> = {
  healthy: '#10B981',
  stress: '#F59E0B',
  mold: '#8B5CF6',
  dry: '#EF4444',
} as const;

/**
 * Status labels mapping
 */
export const STATUS_LABELS: Record<HealthClass, string> = {
  healthy: 'Healthy',
  stress: 'Stress',
  mold: 'Mold',
  dry: 'Dry',
} as const;

/**
 * Status descriptions mapping
 */
export const STATUS_DESCRIPTIONS: Record<HealthClass, string> = {
  healthy: 'No signs of disease or stress detected. The plant is in good condition.',
  stress: 'Physiological stress detected — chlorosis or discoloration on leaves.',
  mold: 'Fungal infection detected on the leaf surface. Treatment recommended.',
  dry: 'Drought stress and tissue necrosis detected. Immediate action needed.',
} as const;

/**
 * Severity levels for each health class (used for visual weight and priority)
 */
export const STATUS_SEVERITY: Record<HealthClass, { level: string; score: number }> = {
  healthy: { level: 'Good', score: 100 },
  stress: { level: 'Attention', score: 55 },
  mold: { level: 'Warning', score: 25 },
  dry: { level: 'Critical', score: 15 },
} as const;

/**
 * Confidence interpretation thresholds
 */
export function getConfidenceLabel(confidence: number): { text: string; color: string } {
  if (confidence >= 75) return { text: 'High certainty', color: '#10B981' };
  if (confidence >= 50) return { text: 'Moderate certainty', color: '#F59E0B' };
  return { text: 'Low certainty — consider rescanning', color: '#EF4444' };
}

/**
 * Animation configurations
 */
export const SPRING_CONFIG = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

/** Route outlet: short ease, no spring (snappy, cheap to composite). */
export const TRANSITION_PAGE = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as const,
};

/**
 * Stagger animation delays
 */
export const STAGGER_DELAY = 0.05;
export const BASE_DELAY = 0.1;
