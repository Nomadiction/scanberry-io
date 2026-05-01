import {
  Analysis,
  AnalysisListResponse,
  AnalysisUploadResponse,
  BackendAnalysisListItem,
  BackendAnalysisListResponse,
  BackendAnalysisResponse,
  DamageBreakdown,
  HealthClass,
} from '../types/analysis';
import { STATUS_COLORS, STATUS_LABELS } from '../lib/constants';
import { MOCK_ANALYSES } from '../lib/mock-data';

// ---------- Configuration ----------

/** API base URL — set via VITE_API_BASE_URL at build time. */
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').toString().trim();
const API_BASE_URL = RAW_BASE.replace(/\/+$/, '') || 'http://localhost:8000';

/**
 * Mock mode is for offline UI work / Storybook-like browsing.
 * Defaults to OFF in production builds. Force on with `VITE_USE_MOCK=true`.
 */
const USE_MOCK_DATA =
  String(import.meta.env.VITE_USE_MOCK ?? 'false').toLowerCase() === 'true';

const API_PREFIX = '/api/v1';

// ---------- Backend → frontend mappers ----------

/**
 * Resolve a URL from the backend:
 *  - relative paths → prepend API_BASE_URL
 *  - http:// → upgrade to https:// (prevents mixed-content blocking)
 */
function resolveUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  // Backend may hardcode http:// but the SWA frontend is served over https,
  // so the browser blocks mixed content. Force https.
  if (url.startsWith('http://')) return url.replace('http://', 'https://');
  if (url.startsWith('https://')) return url;
  return `${API_BASE_URL}${url}`;
}

/** Convert a 0..1 probability to a 0..100 percentage. */
function pct(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value * 100));
}

/** Estimated pixels for a lesion type (used by UI bars + labels). */
function estimatePixels(percentage: number, w: number, h: number): number {
  if (percentage <= 0 || w <= 0 || h <= 0) return 0;
  return Math.round((percentage / 100) * w * h);
}

function buildDamageBreakdown(
  data: BackendAnalysisResponse,
): DamageBreakdown[] {
  const damage = data.damage;
  if (!damage) return [];

  const w = data.image_width || 0;
  const h = data.image_height || 0;

  const items: DamageBreakdown[] = [];

  const push = (key: 'stress' | 'mold' | 'dry', value: number | null) => {
    if (value == null || value <= 0) return;
    items.push({
      lesion_type: STATUS_LABELS[key],
      percentage: value,
      area_pixels: estimatePixels(value, w, h),
      color: STATUS_COLORS[key],
    });
  };

  push('stress', damage.stress_pct);
  push('mold', damage.mold_pct);
  push('dry', damage.dry_pct);

  return items;
}

function mapAnalysisResponse(data: BackendAnalysisResponse): Analysis {
  // Fallback: if backend somehow returns no class, pick the most likely.
  const fallbackClass: HealthClass =
    data.health_class ??
    (data.class_probabilities
      ? (Object.entries(data.class_probabilities).sort(
          (a, b) => b[1] - a[1],
        )[0]?.[0] as HealthClass) ?? 'healthy'
      : 'healthy');

  return {
    id: data.id,
    created_at: data.created_at,
    health_class: fallbackClass,
    confidence: pct(data.health_confidence),
    damage_percentage: data.damage?.total_pct ?? 0,
    processing_time_ms: data.processing_time_ms ?? 0,
    damage_breakdown: buildDamageBreakdown(data),
    class_probabilities: data.class_probabilities
      ? {
          healthy: pct(data.class_probabilities.healthy),
          stress: pct(data.class_probabilities.stress),
          mold: pct(data.class_probabilities.mold),
          dry: pct(data.class_probabilities.dry),
        }
      : undefined,
    segmentation_available: data.segmentation_available,
    original_filename: data.original_filename,
    image_url: resolveUrl(data.original_image_url),
    visualization_url: resolveUrl(data.visualization_url),
    mask_url: resolveUrl(data.segmentation_mask_url),
  };
}

function mapListItem(item: BackendAnalysisListItem): Analysis {
  return {
    id: item.id,
    created_at: item.created_at,
    health_class: (item.health_class ?? 'healthy') as HealthClass,
    confidence: pct(item.health_confidence),
    damage_percentage: item.damage_total_pct ?? 0,
    processing_time_ms: item.processing_time_ms ?? 0,
    damage_breakdown: [],
    segmentation_available: item.segmentation_available,
    original_filename: item.original_filename,
    visualization_url: resolveUrl(item.visualization_url),
  };
}

function mapListResponse(
  data: BackendAnalysisListResponse,
): AnalysisListResponse {
  return {
    analyses: data.items.map(mapListItem),
    total: data.total,
    page: data.page,
    per_page: data.page_size,
  };
}

// ---------- HTTP helper with friendly errors ----------

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(0, 'Network error — backend is unreachable');
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* empty body or non-JSON */
    }
    throw new ApiError(response.status, detail);
  }

  // Some endpoints (DELETE) return 204 No Content
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

// ---------- Public API ----------

export const analysisApi = {
  baseUrl: API_BASE_URL,
  isMock: USE_MOCK_DATA,

  async uploadImage(file: File): Promise<AnalysisUploadResponse> {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 1500));
      return { id: '2', status: 'completed' };
    }

    const formData = new FormData();
    formData.append('file', file);

    const data = await request<BackendAnalysisResponse>('/analyze', {
      method: 'POST',
      body: formData,
    });

    return {
      id: data.id,
      status: data.error_message ? 'failed' : 'completed',
      message: data.error_message ?? undefined,
    };
  },

  async getAnalyses(params?: {
    page?: number;
    per_page?: number;
    health_class?: string;
  }): Promise<AnalysisListResponse> {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 300));
      let filtered = [...MOCK_ANALYSES];
      if (params?.health_class && params.health_class !== 'all') {
        filtered = filtered.filter((a) => a.health_class === params.health_class);
      }
      return {
        analyses: filtered,
        total: filtered.length,
        page: params?.page ?? 1,
        per_page: params?.per_page ?? 20,
      };
    }

    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('page_size', String(params.per_page));
    if (params?.health_class) query.append('health_class', params.health_class);

    const qs = query.toString();
    const data = await request<BackendAnalysisListResponse>(
      `/analyses${qs ? `?${qs}` : ''}`,
    );
    return mapListResponse(data);
  },

  async getAnalysis(id: string): Promise<Analysis> {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 200));
      const analysis = MOCK_ANALYSES.find((a) => a.id === id);
      if (!analysis) throw new ApiError(404, 'Analysis not found');
      return analysis;
    }

    const data = await request<BackendAnalysisResponse>(`/analyses/${id}`);
    return mapAnalysisResponse(data);
  },

  async deleteAnalysis(id: string): Promise<void> {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 300));
      return;
    }
    await request<void>(`/analyses/${id}`, { method: 'DELETE' });
  },

  getImageUrl(id: string): string {
    return `${API_BASE_URL}${API_PREFIX}/analyses/${id}/image`;
  },

  getVisualizationUrl(id: string): string {
    return `${API_BASE_URL}${API_PREFIX}/analyses/${id}/visualization`;
  },

  getMaskUrl(id: string): string {
    return `${API_BASE_URL}${API_PREFIX}/analyses/${id}/mask`;
  },
};

export { ApiError };
