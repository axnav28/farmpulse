import { useMemo, useState } from 'react';
import { CheckCheck, RotateCcw, Send, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import AdvisoryKpiCard from '../components/AdvisoryKpiCard';
import { AdvisoryPriorityBadge, AdvisoryStatusBadge, type AdvisoryStatus } from '../components/AdvisoryStatusBadge';
import PageHeader from '../components/PageHeader';
import { advisorySeedData, getLocalizedAdvisoryContent, type AdvisoryLanguage, type AdvisoryRecord } from '../data/advisories';

const advisoryLanguages: AdvisoryLanguage[] = ['English', 'Hindi', 'Marathi', 'Bengali', 'Tamil', 'Telugu', 'Gujarati', 'Kannada'];

export default function AdvisoryCenter() {
  const [advisories, setAdvisories] = useState<AdvisoryRecord[]>(advisorySeedData);
  const [selectedId, setSelectedId] = useState(advisorySeedData[0]?.id ?? '');
  const [language, setLanguage] = useState<AdvisoryLanguage>('English');

  const selectedAdvisory = useMemo(
    () => advisories.find((advisory) => advisory.id === selectedId) ?? advisories[0] ?? null,
    [advisories, selectedId],
  );

  const selectedContent = useMemo(
    () => (selectedAdvisory ? getLocalizedAdvisoryContent(selectedAdvisory, language) : null),
    [selectedAdvisory, language],
  );

  const summary = useMemo(() => {
    const sentToday = advisories.filter((advisory) => isToday(advisory.timestamp)).length;
    return {
      sentToday,
      delivered: advisories.filter((advisory) => advisory.status === 'Delivered').length,
      pending: advisories.filter((advisory) => advisory.status === 'Pending').length,
      failed: advisories.filter((advisory) => advisory.status === 'Failed').length,
    };
  }, [advisories]);

  function updateSelectedStatus(nextStatus: AdvisoryStatus, successMessage: string) {
    if (!selectedAdvisory) return;
    setAdvisories((current) =>
      current.map((advisory) =>
        advisory.id === selectedAdvisory.id
          ? {
              ...advisory,
              status: nextStatus,
              timestamp: new Date().toISOString(),
            }
          : advisory,
      ),
    );
    toast.success(successMessage);
  }

  return (
    <div className="mx-auto flex min-h-full max-w-[1680px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Operational Delivery"
        title="Advisory Center"
        description="Review detected issues, approve farmer-facing guidance, and track whether advisories were delivered and acknowledged in the field."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdvisoryKpiCard label="Advisories Sent Today" value={summary.sentToday} helper="Messages issued in the current advisory cycle" />
        <AdvisoryKpiCard label="Delivered" value={summary.delivered} helper="Confirmed as delivered to the farmer channel" />
        <AdvisoryKpiCard label="Pending" value={summary.pending} helper="Awaiting dispatch or delivery confirmation" />
        <AdvisoryKpiCard label="Failed" value={summary.failed} helper="Needs resend or local follow-up support" />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] xl:items-stretch">
        <section className="min-w-0 overflow-hidden rounded-3xl border border-border bg-surface-1 p-5 shadow-[0_16px_40px_rgba(20,44,31,0.08)] xl:max-h-[calc(100dvh-11rem)] xl:overflow-y-auto">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-text-main">Pending &amp; Recent Advisories</h2>
              <p className="mt-1 text-sm text-text-muted">Operational queue for extension officers and agricultural authorities.</p>
            </div>
            <span className="rounded-full bg-surface-2 px-4 py-2 text-xs font-semibold text-text-main">Mock operational feed</span>
          </div>

          <div className="space-y-3">
            {advisories.map((advisory) => {
              const isSelected = advisory.id === selectedAdvisory?.id;
              const content = getLocalizedAdvisoryContent(advisory, language);
              return (
                <article
                  key={advisory.id}
                  className={`rounded-3xl border p-4 transition ${
                    isSelected ? 'border-primary/40 bg-primary/5 shadow-[0_12px_30px_rgba(31,122,77,0.12)]' : 'border-border bg-surface-2'
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-text-main">{advisory.farmerName}</p>
                        <AdvisoryPriorityBadge priority={advisory.priority} />
                        <AdvisoryStatusBadge status={advisory.status} />
                      </div>
                      <p className="mt-2 text-sm text-text-muted">{advisory.village} • {advisory.farmId}</p>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <QueueField label="Detected Problem" value={content.detectedProblem} />
                        <QueueField label="Recommended Action" value={content.recommendedAction} />
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                        {new Date(advisory.timestamp).toLocaleString('en-IN')}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedId(advisory.id)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          isSelected ? 'bg-primary text-white' : 'border border-primary/30 bg-white text-primary'
                        }`}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="min-w-0 space-y-6 xl:flex xl:max-h-[calc(100dvh-11rem)] xl:flex-col xl:overflow-y-auto xl:pr-1">
          <div className="rounded-3xl border border-border bg-surface-1 p-5 shadow-[0_16px_40px_rgba(20,44,31,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-text-main">Advisory Detail &amp; Preview</h2>
                <p className="mt-1 text-sm text-text-muted">Operational review panel before field communication is triggered.</p>
              </div>
              {selectedAdvisory && <AdvisoryStatusBadge status={selectedAdvisory.status} />}
            </div>

            {!selectedAdvisory && <p className="mt-4 text-sm text-text-muted">Select an advisory from the queue to review the recommendation.</p>}

            {selectedAdvisory && selectedContent && (
              <div className="mt-5 space-y-4">
                <PreviewSection
                  title="Problem Detected"
                  value={selectedContent.detectedProblem}
                  helper={`${selectedAdvisory.farmerName} • ${selectedAdvisory.village} • ${selectedAdvisory.farmId}`}
                />
                <PreviewSection
                  title="Recommended Action"
                  value={selectedContent.recommendedAction}
                  helper={`Priority level: ${selectedAdvisory.priority}`}
                />
                <PreviewSection
                  title="Farmer Message Preview"
                  value={selectedContent.farmerMessage}
                  helper={`Final outbound communication preview • ${language}`}
                />
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-surface-1 p-5 shadow-[0_16px_40px_rgba(20,44,31,0.08)]">
            <h3 className="text-base font-semibold text-text-main">Delivery Status Tracking</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdvisoryStatusBadge status="Delivered" />
              <AdvisoryStatusBadge status="Pending" />
              <AdvisoryStatusBadge status="Failed" />
              <AdvisoryStatusBadge status="Acknowledged" />
            </div>
            <div className="mt-4 rounded-2xl border border-border bg-surface-2 p-4">
              <p className="text-sm text-text-muted">
                Track whether the message was sent, delivered, failed in transit, or acknowledged by field staff or the farmer network.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface-1 p-5 shadow-[0_16px_40px_rgba(20,44,31,0.08)]">
            <h3 className="text-base font-semibold text-text-main">Actions</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <ActionButton
                icon={Send}
                label="Send Advisory"
                onClick={() => updateSelectedStatus('Delivered', 'Advisory sent to farmer channel')}
                disabled={!selectedAdvisory || selectedAdvisory.status === 'Delivered' || selectedAdvisory.status === 'Acknowledged'}
              />
              <ActionButton
                icon={RotateCcw}
                label="Resend Failed"
                onClick={() => updateSelectedStatus('Pending', 'Failed advisory moved back into delivery queue')}
                disabled={!selectedAdvisory || selectedAdvisory.status !== 'Failed'}
              />
              <ActionButton
                icon={CheckCheck}
                label="Mark as Acknowledged"
                onClick={() => updateSelectedStatus('Acknowledged', 'Advisory marked as acknowledged')}
                disabled={!selectedAdvisory || (selectedAdvisory.status !== 'Delivered' && selectedAdvisory.status !== 'Pending')}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface-1 p-5 shadow-[0_16px_40px_rgba(20,44,31,0.08)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-text-main">Delivery Language</h3>
                <p className="mt-1 text-sm text-text-muted">Choose which Indian language to send the advisory in.</p>
              </div>
              <label className="block">
                <span className="sr-only">Advisory language</span>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as AdvisoryLanguage)}
                  className="w-full rounded-full border border-border bg-surface-2 px-4 py-3 text-sm font-semibold text-text-main outline-none sm:min-w-[220px]"
                >
                  {advisoryLanguages.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface-1 p-5 shadow-[0_16px_40px_rgba(20,44,31,0.08)]">
            <h3 className="text-base font-semibold text-text-main">Farmer Delivery Preview</h3>
            <p className="mt-1 text-sm text-text-muted">Simulated phone view of the outbound advisory message.</p>
            {selectedAdvisory && selectedContent ? (
              <div className="mt-5 flex justify-center">
                <PhoneSimulator advisory={selectedAdvisory} content={selectedContent} language={language} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-text-muted">Select an advisory to preview the message on a phone.</p>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-surface-1 p-5 shadow-[0_16px_40px_rgba(20,44,31,0.08)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-2 text-amber-700 dark:text-amber-300">
                <ShieldAlert size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-main">Mock workflow mode</p>
                <p className="text-sm text-text-muted">Interactions on this page simulate operational behavior only and do not send real advisories.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function QueueField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="mt-2 text-sm leading-6 text-text-main">{value}</p>
    </div>
  );
}

function PreviewSection({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{title}</p>
      <p className="mt-2 text-sm leading-7 text-text-main">{value}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-text-muted">{helper}</p>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Send;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-2 disabled:text-text-muted"
    >
      <Icon size={16} className={disabled ? 'text-text-muted' : 'text-white'} />
      {label}
    </button>
  );
}

function PhoneSimulator({
  advisory,
  content,
  language,
}: {
  advisory: AdvisoryRecord;
  content: ReturnType<typeof getLocalizedAdvisoryContent>;
  language: AdvisoryLanguage;
}) {
  return (
    <div className="w-full max-w-[296px] rounded-[2.25rem] border border-[#1c2e23] bg-[#0f1813] p-3 shadow-[0_28px_80px_rgba(12,24,18,0.35)]">
      <div className="mx-auto mb-3 h-1.5 w-24 rounded-full bg-white/15" />
      <div className="overflow-hidden rounded-[1.75rem] bg-[#f2f7f1]">
        <div className="border-b border-black/5 bg-[#e6efe4] px-4 py-3">
          <p className="text-sm font-semibold text-[#173624]">Farmer Messages</p>
          <p className="mt-1 text-xs text-[#5c7363]">{advisory.farmerName} • {language}</p>
        </div>

        <div className="space-y-3 bg-[linear-gradient(180deg,#edf5ec,#f9fcf9)] px-4 py-4">
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-[1.35rem] rounded-bl-md bg-white px-4 py-3 shadow-[0_10px_24px_rgba(20,44,31,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7e71]">FarmPulse advisory</p>
              <p className="mt-2 text-sm leading-6 text-[#173624]">{content.farmerMessage}</p>
              <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-[#708476]">
                <span>{new Date(advisory.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                <span>{advisory.status}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="max-w-[72%] rounded-[1.35rem] rounded-br-md bg-[#d7ead8] px-4 py-3 text-sm leading-6 text-[#173624]">
              Field team informed. Tracking delivery in {language}.
            </div>
          </div>
        </div>

        <div className="border-t border-black/5 bg-white px-4 py-3">
          <div className="flex items-center justify-between rounded-full border border-[#d6e4d5] bg-[#f7faf6] px-4 py-3">
            <span className="text-sm text-[#6f8576]">SMS advisory queued</span>
            <Send size={15} className="text-[#1a3a2a]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function isToday(timestamp: string) {
  const value = new Date(timestamp);
  const now = new Date();
  return value.getFullYear() === now.getFullYear()
    && value.getMonth() === now.getMonth()
    && value.getDate() === now.getDate();
}
