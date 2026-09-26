import type { AnalysisResponse, AuditEntry, DistrictSummary, DistrictsResponse, RiskLevel } from '../types/farmpulse';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const defaultQuery = 'Generate a pan-India institutional crop stress summary and recommend district-level intervention priorities.';
const REQUEST_TIMEOUT_MS = 2500;

const demoDistrictSeed: Array<[string, string, string, number, number, number, number]> = [
  ['Yavatmal', 'Maharashtra', 'Cotton', 0.52, 0.68, 78, 4.2], ['Akola', 'Maharashtra', 'Cotton', 0.54, 0.68, 72, 3.4],
  ['Nashik', 'Maharashtra', 'Soybean', 0.64, 0.65, 38, 2.1], ['Nagpur', 'Maharashtra', 'Soybean', 0.63, 0.65, 42, 2.3],
  ['Amravati', 'Maharashtra', 'Cotton', 0.58, 0.68, 59, 3], ['Ludhiana', 'Punjab', 'Wheat', 0.62, 0.65, 52, 3.6],
  ['Bathinda', 'Punjab', 'Cotton', 0.55, 0.68, 70, 2.4], ['Moga', 'Punjab', 'Wheat', 0.64, 0.65, 40, 2.1],
  ['Patiala', 'Punjab', 'Wheat', 0.65, 0.65, 35, 2.8], ['Sangrur', 'Punjab', 'Rice', 0.69, 0.70, 37, 2.2],
  ['Meerut', 'UP', 'Sugarcane', 0.71, 0.74, 44, 3.9], ['Agra', 'UP', 'Wheat', 0.60, 0.65, 57, 2.5],
  ['Jhansi', 'UP', 'Wheat', 0.59, 0.65, 61, 1.9], ['Varanasi', 'UP', 'Rice', 0.68, 0.70, 39, 2],
  ['Bareilly', 'UP', 'Sugarcane', 0.70, 0.74, 46, 2.4], ['Indore', 'MP', 'Soybean', 0.61, 0.65, 55, 3.7],
  ['Ujjain', 'MP', 'Soybean', 0.64, 0.65, 41, 2.6], ['Sehore', 'MP', 'Soybean', 0.62, 0.65, 49, 2.8],
  ['Vidisha', 'MP', 'Wheat', 0.63, 0.65, 43, 2], ['Gwalior', 'MP', 'Wheat', 0.58, 0.65, 62, 1.8],
  ['Jaipur', 'Rajasthan', 'Mustard', 0.56, 0.62, 67, 2.4], ['Kota', 'Rajasthan', 'Soybean', 0.60, 0.65, 58, 2.3],
  ['Sri Ganganagar', 'Rajasthan', 'Cotton', 0.53, 0.68, 76, 2.2], ['Ajmer', 'Rajasthan', 'Wheat', 0.61, 0.65, 51, 1.7],
  ['Bikaner', 'Rajasthan', 'Wheat', 0.57, 0.65, 64, 1.9],
];

function riskLevel(score: number): RiskLevel {
  if (score >= 85) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 45) return 'MEDIUM';
  return 'LOW';
}

export const DEMO_DISTRICTS_RESPONSE: DistrictsResponse = (() => {
  const districts: DistrictSummary[] = demoDistrictSeed.map(([district, state, crop, ndviScore, baseline, riskScore, acreageLakh]) => ({
    id: district.toLowerCase().split(' ').join('-'), district, state, crop, ndviScore, baseline, riskScore,
    riskLevel: riskLevel(riskScore), acreageLakh, lat: 22.5, lon: 78.5, dataFreshnessDays: 5,
    ndviSource: 'instant-demo-snapshot', updatedAt: new Date().toISOString(),
  }));
  const stateNames = [...new Set(districts.map((item) => item.state))];
  const states = stateNames.map((state) => {
    const rows = districts.filter((item) => item.state === state);
    const criticalDistricts = rows.filter((item) => item.riskLevel === 'CRITICAL').length;
    return { state, avgRisk: Math.round(rows.reduce((sum, row) => sum + row.riskScore, 0) / rows.length), criticalDistricts, districtCount: rows.length, emergencyAlert: criticalDistricts >= 3 };
  });
  return { districts, states, summary: { districtsMonitored: districts.length, activeAlerts: districts.filter((item) => item.riskScore >= 70).length, farmersCovered: 86000000, lastScanTimestamp: new Date().toISOString() } };
})();

function withTimeout<T>(promise: Promise<T>, fallback: T, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), timeoutMs);
    promise.then((value) => { window.clearTimeout(timer); resolve(value); }).catch(() => { window.clearTimeout(timer); resolve(fallback); });
  });
}

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
  return withTimeout(fetch(url('/api/districts')).then((response) => {
    if (!response.ok) throw buildApiError('Failed to load district summaries');
    return response.json() as Promise<DistrictsResponse>;
  }), DEMO_DISTRICTS_RESPONSE);
}

export async function fetchDistrictDetail(districtId: string): Promise<AnalysisResponse> {
  const district = DEMO_DISTRICTS_RESPONSE.districts.find((item) => item.id === districtId) ?? DEMO_DISTRICTS_RESPONSE.districts[0];
  return withTimeout(fetch(url(`/api/district/${districtId}`)).then((response) => {
    if (!response.ok) throw buildApiError('Failed to load district detail');
    return response.json() as Promise<AnalysisResponse>;
  }), buildDemoAnalysis(district, crypto.randomUUID(), district.crop, 'English'));
}

export async function runAnalysis(payload: {
  district: string;
  crop: string;
  language: string;
  farmer_query?: string;
  run_id: string;
  edge_case?: string;
}): Promise<AnalysisResponse> {
  const request = fetch(url('/api/analyze'), {
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
  }).then((response) => {
    if (!response.ok) throw buildApiError('Analysis run failed');
    return response.json() as Promise<AnalysisResponse>;
  });
  const district = DEMO_DISTRICTS_RESPONSE.districts.find((item) => item.district === payload.district) ?? DEMO_DISTRICTS_RESPONSE.districts[0];
  return withTimeout(request, buildDemoAnalysis(district, payload.run_id, payload.crop, payload.language));
}

export function buildDemoAnalysis(district: DistrictSummary, runId: string, crop: string, language: string): AnalysisResponse {
  const category = district.riskLevel;
  const rootCause = category === 'HIGH' || category === 'CRITICAL' ? 'Emerging vegetation stress with weather-linked crop pressure' : 'Mixed agronomic stress; monitor and verify at field level';
  return {
    runId, district: district.district, state: district.state, crop, language, ndviScore: district.ndviScore, ndviBaseline: district.baseline,
    ndviAnomalyPct: Number((((district.ndviScore - district.baseline) / district.baseline) * 100).toFixed(1)),
    weatherData: { rainfall_7d_mm: 52, rainfall_anomaly_pct: 4, avg_temp_c: 29, temp_anomaly_c: 1.2, humidity_pct: 64, weather_anomaly: 'normal', source: 'instant-demo-snapshot', stale: true },
    cropStage: 'Vegetative', daysToHarvest: 45, pestRisk: 'General field stress', pestProbability: 28,
    riskReport: { district: district.district, crop, riskScore: district.riskScore, riskCategory: category, rootCause, confidenceLevel: 71, recommendedAction: 'Scout priority fields and monitor canopy for 5 days', escalate: category === 'CRITICAL' },
    advisorySms: `${district.district}: early ${crop} stress signal detected. Contact your local KVK for field verification.`, advisoryWhatsapp: `⚠️ ${crop} stress signal detected in ${district.district}. Inspect priority fields and contact KVK.`, advisoryInstitutional: `${district.district}, ${district.state}: risk ${category} (${district.riskScore}/100). ${rootCause}.`,
    reasoningChain: [{ title: 'Checked NDVI vs seasonal baseline', detail: `NDVI ${district.ndviScore.toFixed(2)} vs baseline ${district.baseline.toFixed(2)}.` }, { title: 'Prepared institutional priority', detail: 'Instant snapshot shown while live providers refresh in the background.' }], auditLog: [], confidence: 71, warnings: ['Showing instant snapshot; live provider refresh is still pending.'], escalate: category === 'CRITICAL', escalationReason: category === 'CRITICAL' ? 'critical risk' : '', dataFreshnessDays: 5, modelUsed: 'instant-demo-snapshot',
    soilSnapshot: { moisturePct: 48, moistureBand: 'Adequate', soilPH: 6.8, nitrogenKgHa: 245, electricalConductivity: 0.42, summary: 'Instant modeled soil snapshot' }, forecast5d: [], dataSources: ['Instant demo snapshot', 'Live provider refresh in background'], districtRecord: { district: district.district, state: district.state, kvk_contact: 'Contact local KVK', primary_crop: crop },
    institutionalOutputs: { heatmap: DEMO_DISTRICTS_RESPONSE.states, fpoBriefing: DEMO_DISTRICTS_RESPONSE.districts, insuranceSignals: [], governmentEarlyWarning: { format: 'PM Digital Agriculture Mission style', state: district.state, district: district.district, riskCategory: category, generatedAt: new Date().toISOString(), dataFreshnessDays: 5, confidence: 71, emergencyAlert: category === 'CRITICAL' } },
  };
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
