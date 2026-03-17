'use client';

import { useEffect, useState } from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface PushRecord {
  id: string;
  transactionId: string | null;
  cozeroEndpoint: string;
  cozeroLogId: number | null;
  status: string;
  errorMessage: string | null;
  pushedAt: string | null;
  createdAt: string;
  run: {
    pipelineType: string;
    agency: { name: string };
  };
}

const PIPELINE_LABELS: Record<string, string> = {
  cognos: 'Cognos',
  credit_card: 'Credit Card',
  travelperk: 'TravelPerk',
  corporate_traveller: 'Corporate Traveller',
};

export default function HistoryPage(): React.ReactElement {
  const [pushes, setPushes] = useState<PushRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const res = await fetch('/api/push?limit=100');
        const data = await res.json() as PushRecord[];
        setPushes(data);
      } catch {
        // Show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" label="Loading push history..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-black">Push History</h1>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Transaction</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Pipeline</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Agency</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Cozero Log ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Error</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Pushed At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pushes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  No push history yet.
                </td>
              </tr>
            ) : (
              pushes.map(push => (
                <tr key={push.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{push.transactionId ?? '-'}</td>
                  <td className="px-4 py-3 text-sm">{PIPELINE_LABELS[push.run.pipelineType] ?? push.run.pipelineType}</td>
                  <td className="px-4 py-3 text-sm">{push.run.agency.name}</td>
                  <td className="px-4 py-3 text-sm font-mono">{push.cozeroLogId ?? '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={push.status} /></td>
                  <td className="px-4 py-3 text-xs text-red-600 truncate max-w-[200px]">{push.errorMessage ?? ''}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {push.pushedAt ? new Date(push.pushedAt).toLocaleString() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
