import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import RiskMap from '../components/RiskMap';
import { fetchDistricts } from '../lib/api';
import type { DistrictSummary, DistrictsResponse } from '../types/farmpulse';

export default function InstitutionalDashboard() {
  const [districtsData, setDistrictsData] = useState<DistrictsResponse | null>(null);

  useEffect(() => {
    fetchDistricts()
      .then(setDistrictsData)
      .catch(() => toast.error('Could not load institutional dashboard'));
  }, []);

  const highRisk = useMemo(
    () => (districtsData?.districts ?? []).filter((district) => district.riskLevel === 'HIGH' || district.riskLevel === 'CRITICAL'),
    [districtsData],
  );

  const topStates = useMemo(
    () => [...(districtsData?.states ?? [])].sort((a, b) => Number(b.emergencyAlert) - Number(a.emergencyAlert) || b.criticalDistricts - a.criticalDistricts || b.avgRisk - a.avgRisk),
    [districtsData],
  );

  const actionQueue = useMemo(
    () => [...highRisk].sort((a, b) => b.riskScore - a.riskScore).slice(0, 8),
    [highRisk],
  );

  const briefingCsv = useMemo(() => {
    const rows = [
      ['District', 'State', 'Crop', 'Risk Score', 'Risk Level', 'Priority', 'Acreage (Lakh Acres)', 'Recommended Action'],
      ...(districtsData?.districts ?? []).map((district) => [
        district.district,
        district.state,
        district.crop,
        String(district.riskScore),
        district.riskLevel,
        getPriorityTier(district),
        district.acreageLakh.toFixed(1),
        getRecommendedAction(district),
      ]),
    ];

    return `data:text/csv;charset=utf-8,${encodeURIComponent(rows.map((row) => row.map(escapeCsv).join(',')).join('\n'))}`;
  }, [districtsData]);

  return (
    <div className="mx-auto flex min-h-full max-w-[1680px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Institutional HQ"
        title="Pan-India Response Dashboard"
        description="Prioritize states and districts for extension deployment, pre-claim review, and department intervention using early-warning crop stress intelligence."
        action={
          <a
            href={briefingCsv}
            download="farmpulse-institutional-briefing.csv"
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
          >
            Export Briefing CSV
          </a>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="States flagged" value={topStates.filter((state) => state.emergencyAlert || state.avgRisk >= 60).length} helper="Priority states for government review" />
        <SummaryCard label="Districts in action queue" value={actionQueue.length} helper="Immediate monitoring and outreach targets" />
        <SummaryCard label="Acreage under watch" value={`${highRisk.reduce((sum, district) => sum + district.acreageLakh, 0).toFixed(1)}L`} helper="High and critical risk acreage" />
        <SummaryCard label="Expected claim pressure" value={`${actionQueue.length ? Math.round(actionQueue.reduce((sum, district) => sum + district.riskScore, 0) / actionQueue.length) : 0}%`} helper="Portfolio-weighted loss signal" />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <RiskMap districts={districtsData?.districts ?? []} height={500} />

        <div className="min-w-0 space-y-6 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto xl:pr-1">
          <div className="min-w-0 overflow-hidden rounded-3xl border border-border bg-surface-1 p-5 shadow-[0_16px_40px_rgba(20,44,31,0.08)]">
            <h3 className="text-base font-semibold text-text-main">State Prioritization</h3>
            <div className="mt-4 space-y-3">
              {topStates.map((state) => (
                <div key={state.state} className="rounded-2xl bg-surface-2 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-text-main">{state.state}</p>
                    <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-text-main">
                      Avg Risk {state.avgRisk}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-text-muted">
                    {state.criticalDistricts} critical districts across {state.districtCount} monitored districts
                    {state.emergencyAlert ? ' • emergency alert threshold met' : ''}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-text-muted">
                    {state.emergencyAlert ? 'Escalate to state response cell' : 'Maintain district-level watch and field verification'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-3xl border border-border bg-surface-1 p-5 shadow-[0_16px_40px_rgba(20,44,31,0.08)]">
            <h3 className="text-base font-semibold text-text-main">Extension Service Targeting</h3>
            <div className="mt-4 space-y-3">
              {actionQueue.map((district) => (
                <div key={district.id} className="rounded-2xl border border-border bg-surface-2 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-text-main">{district.district}</p>
                      <p className="text-sm text-text-muted">{district.state} • {district.crop}</p>
                    </div>
                    <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-text-main">{getPriorityTier(district)}</span>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <InfoLine label="Recommended response" value={getRecommendedAction(district)} />
                    <InfoLine label="Operational window" value={district.riskLevel === 'CRITICAL' ? 'Deploy within 72 hours' : 'Review within 7 days'} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="min-w-0 overflow-hidden rounded-3xl border border-border bg-surface-1 p-5 shadow-[0_16px_40px_rgba(20,44,31,0.08)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-text-main">Insurance Pre-Claim Signals</h3>
            <span className="rounded-full bg-surface-2 px-4 py-2 text-xs font-semibold text-text-main">Loss prevention view</span>
          </div>
          <div className="space-y-3">
            {actionQueue.slice(0, 6).map((district) => (
              <div key={`${district.id}-claim`} className="rounded-2xl border border-border bg-surface-2 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-text-main">{district.district}</p>
                    <p className="text-sm text-text-muted">{district.state} • {district.crop}</p>
                  </div>
                  <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-text-main">{district.riskLevel}</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <InfoLine label="Estimated affected acreage" value={`${Math.min(48, district.riskScore * 0.42).toFixed(1)}%`} />
                  <InfoLine label="Claim probability" value={`${Math.min(95, Math.round(district.riskScore * 0.9))}%`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-3xl border border-border bg-surface-1 p-5 shadow-[0_16px_40px_rgba(20,44,31,0.08)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-text-main">Agency and FPO Briefing Table</h3>
            <span className="rounded-full bg-surface-2 px-4 py-2 text-xs font-semibold text-text-main">Export-ready</span>
          </div>
          <div className="max-h-[calc(100dvh-18rem)] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.2em] text-text-muted">
                <tr>
                  <th className="px-3 py-3">District</th>
                  <th className="px-3 py-3">State</th>
                  <th className="px-3 py-3">Crop</th>
                  <th className="px-3 py-3">Priority</th>
                  <th className="px-3 py-3">Risk Score</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {(districtsData?.districts ?? []).map((district) => (
                  <tr key={district.id} className="border-t border-border">
                    <td className="px-3 py-4 font-semibold text-text-main">{district.district}</td>
                    <td className="px-3 py-4 text-text-main">{district.state}</td>
                    <td className="px-3 py-4 text-text-main">{district.crop}</td>
                    <td className="px-3 py-4 text-text-main">{getPriorityTier(district)}</td>
                    <td className="px-3 py-4 font-mono text-text-main">{district.riskScore}</td>
                    <td className="px-3 py-4 text-text-main">{getRecommendedAction(district)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="mt-2 text-sm text-text-main">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: number | string; helper: string }) {
  return (
    <div className="rounded-3xl border border-border bg-surface-1 p-5 shadow-[0_16px_40px_rgba(20,44,31,0.08)]">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-text-main">{value}</p>
      <p className="mt-2 text-sm leading-6 text-text-muted">{helper}</p>
    </div>
  );
}

function getPriorityTier(district: DistrictSummary) {
  if (district.riskLevel === 'CRITICAL') return 'Tier 1';
  if (district.riskLevel === 'HIGH') return 'Tier 2';
  if (district.riskLevel === 'MEDIUM') return 'Tier 3';
  return 'Tier 4';
}

function getRecommendedAction(district: DistrictSummary) {
  if (district.riskLevel === 'CRITICAL') return 'Escalate district response and deploy field verification';
  if (district.riskLevel === 'HIGH') return 'Target extension outreach and insurer watchlist review';
  if (district.riskLevel === 'MEDIUM') return 'Schedule preventive advisories and monitor next scan';
  return 'Continue routine surveillance';
}

function escapeCsv(value: string) {
  return `"${value.split('"').join('""')}"`;
}
