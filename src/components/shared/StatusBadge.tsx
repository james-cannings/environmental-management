'use client';

interface StatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  success: 'bg-green-100 text-green-800',
  running: 'bg-blue-100 text-blue-800',
  processing: 'bg-blue-100 text-blue-800',
  pending: 'bg-gray-100 text-gray-600',
  uploaded: 'bg-gray-100 text-gray-600',
  failed: 'bg-red-100 text-red-800',
  error: 'bg-red-100 text-red-800',
  cancelled: 'bg-yellow-100 text-yellow-800',
  skipped: 'bg-yellow-100 text-yellow-800',
  excluded: 'bg-orange-100 text-orange-800',
  categorised: 'bg-emerald-100 text-emerald-800',
  active: 'bg-blue-100 text-blue-800',
  pending_review: 'bg-purple-100 text-purple-800',
};

export default function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
