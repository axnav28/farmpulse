export default function AdvisoryKpiCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface-1 p-5 shadow-[0_16px_40px_rgba(20,44,31,0.08)]">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-text-main">{value}</p>
      <p className="mt-2 text-sm leading-6 text-text-muted">{helper}</p>
    </div>
  );
}
