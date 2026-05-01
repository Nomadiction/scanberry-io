import type { Analysis, HealthClass } from '../types/analysis';
import { STATUS_COLORS, STATUS_LABELS, STATUS_DESCRIPTIONS } from './constants';

export const MOCK_ANALYSES: Analysis[] = [
  {
    id: '1',
    created_at: '2026-04-05T10:30:00Z',
    health_class: 'healthy',
    confidence: 96.8,
    damage_percentage: 0,
    processing_time_ms: 1247,
    damage_breakdown: [],
  },
  {
    id: '2',
    created_at: '2026-04-04T15:20:00Z',
    health_class: 'stress',
    confidence: 89.3,
    damage_percentage: 12.4,
    processing_time_ms: 1583,
    damage_breakdown: [
      {
        lesion_type: 'Chlorosis',
        area_pixels: 4820,
        percentage: 8.2,
        color: '#F59E0B',
      },
      {
        lesion_type: 'Necrosis',
        area_pixels: 2460,
        percentage: 4.2,
        color: '#D97706',
      },
    ],
  },
  {
    id: '3',
    created_at: '2026-04-03T09:15:00Z',
    health_class: 'mold',
    confidence: 94.2,
    damage_percentage: 28.6,
    processing_time_ms: 1692,
    damage_breakdown: [
      {
        lesion_type: 'Powdery Mildew',
        area_pixels: 15240,
        percentage: 18.3,
        color: '#8B5CF6',
      },
      {
        lesion_type: 'Leaf Spot',
        area_pixels: 8620,
        percentage: 10.3,
        color: '#7C3AED',
      },
    ],
  },
  {
    id: '4',
    created_at: '2026-04-02T14:45:00Z',
    health_class: 'dry',
    confidence: 91.7,
    damage_percentage: 45.2,
    processing_time_ms: 1428,
    damage_breakdown: [
      {
        lesion_type: 'Drought Stress',
        area_pixels: 22840,
        percentage: 31.5,
        color: '#EF4444',
      },
      {
        lesion_type: 'Leaf Curl',
        area_pixels: 9920,
        percentage: 13.7,
        color: '#DC2626',
      },
    ],
  },
  {
    id: '5',
    created_at: '2026-04-01T11:00:00Z',
    health_class: 'healthy',
    confidence: 98.5,
    damage_percentage: 0,
    processing_time_ms: 1156,
    damage_breakdown: [],
  },
  {
    id: '6',
    created_at: '2026-03-31T16:30:00Z',
    health_class: 'stress',
    confidence: 87.2,
    damage_percentage: 15.8,
    processing_time_ms: 1734,
    damage_breakdown: [
      {
        lesion_type: 'Nutrient Deficiency',
        area_pixels: 6340,
        percentage: 10.2,
        color: '#F59E0B',
      },
      {
        lesion_type: 'Sun Scald',
        area_pixels: 3480,
        percentage: 5.6,
        color: '#D97706',
      },
    ],
  },
];

export const getHealthClassColor = (healthClass: HealthClass): string => {
  return STATUS_COLORS[healthClass];
};

export const getHealthClassLabel = (healthClass: HealthClass): string => {
  return STATUS_LABELS[healthClass];
};

export const getHealthClassDescription = (healthClass: HealthClass): string => {
  return STATUS_DESCRIPTIONS[healthClass];
};
