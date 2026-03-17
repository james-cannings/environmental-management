'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/shared/StatusBadge';

interface RecentRun {
  id: string;
  pipelineType: string;
  status: string;
  inputRowCount: number | null;
  categorisedCount: number | null;
  createdAt: string;
  agency: { name: string };
  upload: { originalFilename: string };
}

interface DashboardStats {
  totalRuns: number;
  completedRuns: number;
  recentRuns: RecentRun[];
}

const PIPELINE_LABELS: Record<string, string> = {
  cognos: 'Cognos',
  credit_card: 'Credit Card',
  travelperk: 'TravelPerk',
  corporate_traveller: 'Corporate Traveller',
};

export default function DashboardPage(): React.ReactElement {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const res = await fetch('/api/processing?limit=10');
        const runs = (await res.json()) as RecentRun[];
        setStats({
          totalRuns: runs.length,
          completedRuns: runs.filter(r => r.status === 'completed').length,
          recentRuns: runs,
        });
      } catch {
        // Dashboard is non-critical — show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-black">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Processing Runs"
          value={loading ? '...' : String(stats?.totalRuns ?? 0)}
          href="/processing"
        />
        <SummaryCard
          label="Completed"
          value={loading ? '...' : String(stats?.completedRuns ?? 0)}
          href="/processing?status=completed"
        />
        <SummaryCard label="Upload Data" value="Upload" href="/upload" isAction />
        <SummaryCard label="Push History" value="View" href="/history" isAction />
      </div>

      {/* Recent runs */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Processing Runs</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Pipeline</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Agency</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">File</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Rows</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Loading...</td>
                </tr>
              ) : (stats?.recentRuns ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No processing runs yet. <Link href="/upload" className="text-[#0000EB] hover:underline">Upload a file</Link> to get started.
                  </td>
                </tr>
              ) : (
                stats?.recentRuns.map(run => (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{PIPELINE_LABELS[run.pipelineType] ?? run.pipelineType}</td>
                    <td className="px-4 py-3 text-sm">{run.agency.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[200px]">{run.upload.originalFilename}</td>
                    <td className="px-4 py-3 text-sm">{run.inputRowCount ?? '-'}</td>
                    <td className="px-4 py-3"><StatusBadge status={run.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(run.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  href,
  isAction,
}: {
  label: string;
  value: string;
  href: string;
  isAction?: boolean;
}): React.ReactElement {
  return (
    <Link href={href} className="block rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${isAction ? 'text-[#0000EB]' : 'text-gray-900'}`}>
        {value}
      </p>
    </Link>
  );
}
