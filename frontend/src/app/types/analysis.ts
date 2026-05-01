/**
 * Domain types used by the UI.
 *
 * The shape here is intentionally decoupled from the raw backend payload.
 * The API client (`api/analysis.ts`) maps backend responses into this
 * shape via `mapAnalysisResponse` / `mapListResponse`, so screens stay
 * stable even if the wire format evolves.
 */

export type HealthClass = 'healthy' | 'stress' | 'mold' | 'dry';

export interface DamageBreakdown {
  /** Human-readable lesion label, e.g. "Stress lesions" */
  lesion_type: string;
  /** Pixels covered by this lesion type (estimated from %) */
  area_pixels: number;
  /** % of the plant area affected, 0..100 */
  percentage: number;
  /** Hex color used for charts and overlays */
  color: string;
}

export interface ClassProbabilities {
  healthy: number;
  stress: number;
  mold: number;
  dry: number;
}

export interface Analysis {
  id: string;
  created_at: string;
  health_class: HealthClass;
  /** Confidence in 0..100, ready to display */
  confidence: number;
  /** Total damaged area %, 0..100 */
  damage_percentage: number;
  processing_time_ms: number;
  damage_breakdown: DamageBreakdown[];
  /** Per-class probabilities in 0..100 (optional — present for detail view) */
  class_probabilities?: ClassProbabilities;
  /** True when a real segmentation mask is stored on the backend */
  segmentation_available?: boolean;
  /** Original filename, when available */
  original_filename?: string;
  image_url?: string;
  visualization_url?: string;
  mask_url?: string;
}

export interface AnalysisListResponse {
  analyses: Analysis[];
  total: number;
  page: number;
  per_page: number;
}

export interface AnalysisUploadResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  message?: string;
}

// ---------- Backend wire formats (mirrors backend/app/schemas.py) ----------

export interface BackendBoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
}

export interface BackendClassProbabilities {
  healthy: number;
  stress: number;
  mold: number;
  dry: number;
}

export interface BackendDamageMetrics {
  total_pct: number | null;
  stress_pct: number | null;
  mold_pct: number | null;
  dry_pct: number | null;
}

export interface BackendAnalysisResponse {
  id: string;
  created_at: string;
  original_filename: string;
  image_width: number;
  image_height: number;
  detection: BackendBoundingBox | null;
  health_class: HealthClass | null;
  health_confidence: number | null;
  class_probabilities: BackendClassProbabilities | null;
  segmentation_available: boolean;
  segmentation_mask_url: string | null;
  damage: BackendDamageMetrics | null;
  visualization_url: string | null;
  original_image_url: string | null;
  processing_time_ms: number | null;
  pipeline_version: string;
  error_message: string | null;
}

export interface BackendAnalysisListItem {
  id: string;
  created_at: string;
  original_filename: string;
  health_class: HealthClass | null;
  health_confidence: number | null;
  segmentation_available: boolean;
  damage_total_pct: number | null;
  processing_time_ms: number | null;
  visualization_url: string | null;
}

export interface BackendAnalysisListResponse {
  items: BackendAnalysisListItem[];
  total: number;
  page: number;
  page_size: number;
}
