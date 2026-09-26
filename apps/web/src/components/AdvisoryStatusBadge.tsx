import clsx from 'clsx';

export type AdvisoryStatus = 'Delivered' | 'Pending' | 'Failed' | 'Acknowledged';
export type AdvisoryPriority = 'High' | 'Medium' | 'Low';

const statusStyles: Record<AdvisoryStatus, string> = {
  Delivered: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  Pending: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  Failed: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  Acknowledged: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
};

const priorityStyles: Record<AdvisoryPriority, string> = {
  High: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  Medium: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  Low: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

export function AdvisoryStatusBadge({ status }: { status: AdvisoryStatus }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold', statusStyles[status])}>
      {status}
    </span>
  );
}

export function AdvisoryPriorityBadge({ priority }: { priority: AdvisoryPriority }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold', priorityStyles[priority])}>
      {priority} priority
    </span>
  );
}
