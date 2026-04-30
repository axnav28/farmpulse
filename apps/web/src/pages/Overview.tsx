import { useEffect, useMemo, useState } from 'react';
import { ActivitySquare, AlertTriangle, Bot, Clock3, Landmark, MapPinned, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ActivityFeed from '../components/ActivityFeed';
import AgentStatusPanel, { type AgentCardState } from '../components/AgentStatusPanel';
import PageHeader from '../components/PageHeader';
import RiskMap from '../components/RiskMap';
import { createEventSource, fetchDistricts, runAnalysis } from '../lib/api';
import type { AgentEvent, AgentStatus, AnalysisResponse, DistrictSummary, DistrictsResponse } from '../types/farmpulse';

const AGENT_NAMES = [
  'Satellite Stress Scout',
  'Risk Detection Engine',
  'Intervention Prioritizer',
  'Institutional Reporting Agent',
];

const defaultAgentCards: AgentCardState[] = [
  { name: 'Satellite Stress Scout', description: 'Ingests NDVI, freshness, and weather telemetry.', status: 'IDLE' },
  { name: 'Risk Detection Engine', description: 'Scores crop stress, weather anomalies, and exposure across monitored districts.', status: 'IDLE' },
  { name: 'Intervention Prioritizer', description: 'Ranks where extension teams, insurers, and field officers should act first.', status: 'IDLE' },
  { name: 'Institutional Reporting Agent', description: 'Packages auditable briefings for departments, FPOs, and insurers.', status: 'IDLE' },
];

const trendLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];

function buildAgentStatuses(status: AgentStatus): Record<string, AgentStatus> {
  return Object.fromEntries(AGENT_NAMES.map((name) => [name, status])) as Record<string, AgentStatus>;
}

export default function Overview() {
  const [districtsData, setDistrictsData] = useState<DistrictsResponse | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>(buildAgentStatuses('IDLE'));
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [latestRun, setLatestRun] = useState<AnalysisResponse | null>(null);

  useEffect(() => {
    fetchDistricts()
      .then(setDistrictsData)
      .catch(() => toast.error('Could not load district summaries'))
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    const source = districtsData?.districts.slice(0, 5) ?? [];
    return trendLabels.map((label, index) => ({
      week: label,
      ndvi: Number((0.76 - index * 0.04 - (source[index]?.riskScore ?? 0) / 500).toFixed(2)),
    }));
  }, [districtsData]);

  const priorityDistrict = useMemo(() => {
    const districts = districtsData?.districts ?? [];
    return districts.find((district) => district.riskLevel === 'CRITICAL')
      ?? districts.find((district) => district.riskLevel === 'HIGH')
      ?? districts[0]
      ?? null;
  }, [districtsData]);

  const stats = useMemo(() => {
    const districts = districtsData?.districts ?? [];
    const states = districtsData?.states ?? [];
    const criticalAlerts = districts.filter((district) => district.riskLevel === 'CRITICAL').length;
    const acreageAtRisk = districts
      .filter((district) => district.riskLevel === 'HIGH' || district.riskLevel === 'CRITICAL')
      .reduce((sum, district) => sum + district.acreageLakh, 0);
    const expectedClaimExposure = districts.length
      ? Math.round(districts.reduce((sum, district) => sum + Math.min(95, district.riskScore * 0.82), 0) / districts.length)
      : 0;
    const statesUnderWatch = states.filter((state) => state.emergencyAlert || state.avgRisk >= 60).length;
    return {
      districtsMonitored: districts.length,
      criticalAlerts,
      statesUnderWatch,
      acreageAtRisk,
      expectedClaimExposure,
      interventionWindow: priorityDistrict ? (priorityDistrict.riskLevel === 'CRITICAL' ? '24-72 hrs' : '3-7 days') : '3-7 days',
      lastScanTimestamp: districtsData?.summary.lastScanTimestamp ?? '',
    };
  }, [districtsData, priorityDistrict]);

  async function handleRunAnalysis() {
    if (!priorityDistrict) {
      toast.error('District data is still loading');
      return;
    }
    const runId = crypto.randomUUID();
    setRunning(true);
    setEvents([]);
    setAgentStatuses(buildAgentStatuses('IDLE'));

    const source = createEventSource(runId);
    source.onmessage = (rawEvent) => {
      const payload = JSON.parse(rawEvent.data) as AgentEvent;
      setEvents((current) => [payload, ...current].slice(0, 20));
      if (AGENT_NAMES.includes(payload.agent)) {
        setAgentStatuses((current) => ({ ...current, [payload.agent]: payload.status }));
      }
      if (payload.step === 'complete') {
        source.close();
      }
    };

    try {
      const response = await runAnalysis({
        district: priorityDistrict.district,
        crop: priorityDistrict.crop,
        language: 'English',
        farmer_query: `Generate a pan-India institutional early-warning summary for ${priorityDistrict.district}, ${priorityDistrict.state}, and recommend intervention priorities for extension teams, departments, FPOs, and insurers.`,
        run_id: runId,
      });
      setLatestRun(response);
      toast.success('Institutional analysis complete');
    } catch {
      toast.error('Analysis failed');
      setAgentStatuses(buildAgentStatuses('ERROR'));
    } finally {
      setRunning(false);
      source.close();
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-[1680px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="National Command Center"
        title="Pan-India Crop Early Warning"
        description="Track emerging crop stress before visible damage, prioritize intervention windows district by district, and route auditable risk intelligence to departments, extension networks, FPOs, and insurers."
        action={
          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(31,122,77,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play size={16} />
            {running ? 'Running Agents...' : 'Run Priority Scan'}
          </button>
        }
      />

      <AgentStatusPanel
        agents={defaultAgentCards.map((agent) => ({
          ...agent,
          status: agentStatuses[agent.name] ?? 'IDLE',
        }))}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={MapPinned} label="Districts Monitored" value={stats.districtsMonitored} accent="text-primary" />
        <StatCard icon={AlertTriangle} label="Critical Alerts" value={stats.criticalAlerts} accent="text-warning" />
        <StatCard icon={Landmark} label="States Under Watch" value={stats.statesUnderWatch} accent="text-emerald-600" />
        <StatCard icon={ActivitySquare} label="Acreage At Risk" value={`${stats.acreageAtRisk.toFixed(1)}L acres`} accent="text-danger" />
        <StatCard icon={Clock3} label="Intervention Window" value={stats.interventionWindow} accent="text-primary" />
        <StatCard icon={Bot} label="Expected Claim Exposure" value={`${stats.expectedClaimExposure}%`} accent="text-warning" />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.9fr)]">
        <RiskMap districts={districtsData?.districts ?? []} />
        <ActivityFeed events={events} />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 overflow-hidden rounded-3xl border border-border bg-surface-1 p-5 shadow-[0_16px_40px_rgba(20,44,31,0.08)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-text-main">NDVI Trend Snapshot</h3>
            <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Pan-India seeded trend</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="ndviFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1f7a4d" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#1f7a4d" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border-color)" />
                <XAxis dataKey="week" stroke="var(--text-muted)" />
                <YAxis domain={[0.4, 0.9]} stroke="var(--text-muted)" />
                <Tooltip />
                <Area type="monotone" dataKey="ndvi" stroke="#1f7a4d" strokeWidth={3} fill="url(#ndviFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-3xl border border-border bg-surface-1 p-5 shadow-[0_16px_40px_rgba(20,44,31,0.08)]">
          <h3 className="text-base font-semibold text-text-main">Demo Scenario Pulse</h3>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Centerpiece</p>
              <p className="mt-2 text-lg font-semibold text-text-main">Detect crop stress 2-3 weeks before visible damage and route alerts where they matter most</p>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                FarmPulse surfaces the highest-priority district, estimates exposure, and turns signals into action for departments, extension officers, FPOs, and insurers across India.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Metric
                label="Priority District"
                value={priorityDistrict ? `${priorityDistrict.district}, ${priorityDistrict.state}` : loading ? 'Loading...' : 'Awaiting feed'}
              />
              <Metric label="Last Scan" value={stats.lastScanTimestamp ? new Date(stats.lastScanTimestamp).toLocaleString('en-IN') : '--'} />
              <Metric label="Confidence" value={latestRun ? `${latestRun.confidence.toFixed(0)}%` : '71%'} />
              <Metric label="Intervention Priority" value={latestRun ? getInterventionPriority(latestRun.riskReport.riskCategory) : priorityDistrict ? getInterventionPriority(priorityDistrict.riskLevel) : 'Monitoring'} />
              <Metric label="Root Cause" value={latestRun?.riskReport.rootCause ?? 'Emerging vegetation stress with weather-linked crop pressure'} />
              <Metric label="Model Route" value={latestRun?.modelUsed ?? 'claude-haiku-4-5-20251001'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof ActivitySquare;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface-1 p-5 shadow-[0_16px_40px_rgba(20,44,31,0.08)]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{label}</p>
        <Icon className={accent} size={18} />
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-text-main">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="mt-2 text-sm leading-6 text-text-main">{value}</p>
    </div>
  );
}

function getInterventionPriority(riskLevel: DistrictSummary['riskLevel']) {
  if (riskLevel === 'CRITICAL') return 'Immediate escalation';
  if (riskLevel === 'HIGH') return 'Rapid field response';
  if (riskLevel === 'MEDIUM') return 'Preventive monitoring';
  return 'Routine watch';
}
