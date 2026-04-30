import type { AnalysisResponse, AuditEntry, DistrictsResponse } from '../types/farmpulse';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const defaultQuery = 'Generate a pan-India institutional crop stress summary and recommend district-level intervention priorities.';

function url(path: string) {
  return `${API_BASE}${path}`;
}

function buildApiError(fallback: string) {
  if (!API_BASE && !isLocalhost) {
    return new Error('Backend is not configured for production. Set VITE_API_BASE in Vercel to your deployed FastAPI URL.');
  }
  return new Error(fallback);
}

export async function fetchDistricts(): Promise<DistrictsResponse> {
  const response = await fetch(url('/api/districts'));
  if (!response.ok) {
    throw buildApiError('Failed to load district summaries');
  }
  return response.json();
}

export async function fetchDistrictDetail(districtId: string): Promise<AnalysisResponse> {
  const response = await fetch(url(`/api/district/${districtId}`));
  if (!response.ok) {
    throw buildApiError('Failed to load district detail');
  }
  return response.json();
}

export async function runAnalysis(payload: {
  district: string;
  crop: string;
  language: string;
  farmer_query?: string;
  run_id: string;
  edge_case?: string;
}): Promise<AnalysisResponse> {
  const response = await fetch(url('/api/analyze'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      district: payload.district,
      crop: payload.crop,
      language: payload.language,
      farmer_query: payload.farmer_query ?? defaultQuery,
      run_id: payload.run_id,
      edge_case: payload.edge_case,
    }),
  });
  if (!response.ok) {
    throw buildApiError('Analysis run failed');
  }
  return response.json();
}

export async function simulateEdgeCase(payload: {
  scenario: string;
  district: string;
  crop: string;
  language: string;
  run_id: string;
}): Promise<AnalysisResponse> {
  const response = await fetch(url('/api/simulate-edge-case'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw buildApiError('Edge case simulation failed');
  }
  return response.json();
}

export async function fetchAuditLog(filters?: { agent?: string; district?: string; riskLevel?: string }): Promise<{ entries: AuditEntry[] }> {
  const search = new URLSearchParams();
  if (filters?.agent) search.set('agent', filters.agent);
  if (filters?.district) search.set('district', filters.district);
  if (filters?.riskLevel) search.set('riskLevel', filters.riskLevel);
  const response = await fetch(url(`/api/audit-log${search.toString() ? `?${search.toString()}` : ''}`));
  if (!response.ok) {
    throw buildApiError('Failed to load audit log');
  }
  return response.json();
}

export function createEventSource(runId: string) {
  return new EventSource(url(`/api/stream/${runId}`));
}

export function exportAuditLogUrl() {
  return url('/api/audit-log/export');
}
