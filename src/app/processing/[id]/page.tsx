'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface StepDetail {
  id: string;
  stepName: string;
  stepOrder: number;
  status: string;
  inputCount: number | null;
  outputCount: number | null;
  metadata: string | null;
  errorMessage: string | null;
}

interface RunDetail {
  id: string;
  pipelineType: string;
  status: string;
  financialYear: string | null;
  quarter: string | null;
  inputRowCount: number | null;
  excludedCount: number | null;
  categorisedCount: number | null;
  remainingCount: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  agency: { name: string };
  upload: { originalFilename: string; pipelineType: string };
  steps: StepDetail[];
  transactionSummary: Record<string, number>;
}

const STEP_LABELS: Record<string, string> = {
  parse_excel: 'Parse Excel',
  parse_file: 'Parse File',
  filter_agency_quarter: 'Filter Agency/Quarter',
  agency_exclusions: 'Agency Exclusions',
  exclude_zero_amounts: 'Zero Amounts',
  exclude_accounting_entries: 'Accounting Entries',
  supplier_mapping: 'Supplier Mapping',
  mcc_categorisation: 'MCC Categorisation',
  ai_supplier_recommendations: 'AI Supplier Analysis',
  ai_transaction_categorisation: 'AI Transaction Categorisation',
  assemble_cozero_payload: 'Assemble Payloads',
  build_payloads: 'Build Payloads',
  duplicate_check: 'Duplicate Check',
};

export default function RunDetailPage(): React.ReactElement {
  const params = useParams();
  const id = params.id as string;
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const res = await fetch(`/api/processing/${id}`);
        if (!res.ok) throw new Error('Failed to load run');
        const data = await res.json() as RunDetail;
        setRun(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" label="Loading run details..." />
      </div>
    );
  }

  if (error || !run) {
    return <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error ?? 'Run not found'}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-black">Processing Run</h1>
          <p className="mt-1 text-sm text-gray-500">
            {run.agency.name} — {run.upload.originalFilename}
          </p>
        </div>
        <StatusBadge status={run.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Input Rows" value={run.inputRowCount} />
        <StatCard label="Excluded" value={run.excludedCount} />
        <StatCard label="Categorised" value={run.categorisedCount} />
        <StatCard label="Remaining" value={run.remainingCount} />
      </div>

      {run.errorMessage && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{run.errorMessage}</div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Pipeline Steps</h2>
        <div className="space-y-2">
          {run.steps.map(step => (
            <StepCard key={step.id} step={step} />
          ))}
        </div>
      </div>

      {Object.keys(run.transactionSummary).length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Transaction Summary</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(run.transactionSummary).map(([status, count]) => (
              <div key={status} className="rounded-lg border border-gray-200 bg-white p-4">
                <StatusBadge status={status} />
                <p className="mt-2 text-2xl font-semibold text-gray-900">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | null }): React.ReactElement {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value ?? '-'}</p>
    </div>
  );
}

function StepCard({ step }: { step: StepDetail }): React.ReactElement {
  const meta = step.metadata ? JSON.parse(step.metadata) as Record<string, unknown> : null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
          {step.stepOrder}
        </span>
        <div>
          <p className="text-sm font-medium text-gray-900">{STEP_LABELS[step.stepName] ?? step.stepName}</p>
          {step.errorMessage && (
            <p className="text-xs text-red-600">{step.errorMessage}</p>
          )}
          {meta && (
            <p className="text-xs text-gray-500">
              {Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join(' | ')}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-500">
          {step.inputCount ?? 0} → {step.outputCount ?? 0}
        </span>
        <StatusBadge status={step.status} />
      </div>
    </div>
  );
}
