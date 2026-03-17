'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface AgencyOption {
  id: string;
  name: string;
}

const PIPELINE_OPTIONS = [
  { value: 'cognos', label: 'Cognos (Financial Transactions)', accept: '.xlsx' },
  { value: 'credit_card', label: 'Credit Card (Barclaycard)', accept: '.xlsx' },
  { value: 'travelperk', label: 'TravelPerk (Travel)', accept: '.csv' },
  { value: 'corporate_traveller', label: 'Corporate Traveller (Travel)', accept: '.xlsx' },
];

const FY_OPTIONS = ['FY24', 'FY25', 'FY26', 'FY27'];
const QUARTER_OPTIONS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function UploadPage(): React.ReactElement {
  const router = useRouter();
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [pipelineType, setPipelineType] = useState('cognos');
  const [agencyId, setAgencyId] = useState('');
  const [financialYear, setFinancialYear] = useState('FY26');
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    async function loadAgencies(): Promise<void> {
      try {
        const res = await fetch('/api/agencies');
        const data = await res.json() as AgencyOption[];
        setAgencies(data);
        if (data.length > 0) setAgencyId(data[0].id);
      } catch {
        setError('Failed to load agencies');
      }
    }
    loadAgencies();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  function toggleQuarter(q: string): void {
    setSelectedQuarters(prev =>
      prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q],
    );
  }

  async function handleUploadAndProcess(): Promise<void> {
    if (!file || !agencyId) return;

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('pipelineType', pipelineType);
      formData.append('agencyId', agencyId);
      if (pipelineType === 'cognos') {
        formData.append('financialYear', financialYear);
        if (selectedQuarters.length > 0) {
          formData.append('quarters', selectedQuarters.join(','));
        }
      }

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const data = await uploadRes.json() as { error: string };
        throw new Error(data.error);
      }

      const upload = await uploadRes.json() as { id: string };
      setUploading(false);
      setProcessing(true);

      const processRes = await fetch('/api/processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: upload.id,
          pipelineType,
          agencyId,
          financialYear: pipelineType === 'cognos' ? financialYear : undefined,
          quarters: pipelineType === 'cognos' && selectedQuarters.length > 0 ? selectedQuarters : undefined,
        }),
      });

      if (!processRes.ok) {
        const data = await processRes.json() as { error: string };
        throw new Error(data.error);
      }

      const result = await processRes.json() as { runId: string };
      router.push(`/processing/${result.runId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setUploading(false);
      setProcessing(false);
    }
  }

  const currentPipeline = PIPELINE_OPTIONS.find(p => p.value === pipelineType);
  const isCognos = pipelineType === 'cognos';

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-3xl font-semibold text-black">Upload</h1>

      <div>
        <label className="block text-sm font-medium text-gray-700">Pipeline Type</label>
        <select
          value={pipelineType}
          onChange={e => { setPipelineType(e.target.value); setFile(null); }}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0000EB] focus:outline-none focus:ring-1 focus:ring-[#0000EB]"
        >
          {PIPELINE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Agency</label>
        <select
          value={agencyId}
          onChange={e => setAgencyId(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0000EB] focus:outline-none focus:ring-1 focus:ring-[#0000EB]"
        >
          {agencies.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {isCognos && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Financial Year</label>
            <select
              value={financialYear}
              onChange={e => setFinancialYear(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0000EB] focus:outline-none focus:ring-1 focus:ring-[#0000EB]"
            >
              {FY_OPTIONS.map(fy => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Quarters</label>
            <div className="mt-1 flex gap-2">
              {QUARTER_OPTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => toggleQuarter(q)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    selectedQuarters.includes(q)
                      ? 'border-[#0000EB] bg-[#0000EB] text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
          dragOver ? 'border-[#0000EB] bg-blue-50' : 'border-gray-300 bg-white'
        }`}
      >
        {file ? (
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
            <p className="mt-1 text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            <button onClick={() => setFile(null)} className="mt-2 text-xs text-red-600 hover:underline">
              Remove
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Drop your {currentPipeline?.accept} file here, or{' '}
              <label className="cursor-pointer text-[#0000EB] hover:underline">
                browse
                <input
                  type="file"
                  accept={currentPipeline?.accept}
                  onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
                  className="hidden"
                />
              </label>
            </p>
            <p className="mt-1 text-xs text-gray-400">{currentPipeline?.label}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      <button
        onClick={handleUploadAndProcess}
        disabled={!file || !agencyId || uploading || processing}
        className="w-full rounded-md bg-[#0000EB] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0000C4] disabled:opacity-40"
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner size="sm" /> Uploading...
          </span>
        ) : processing ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner size="sm" /> Processing...
          </span>
        ) : (
          'Upload & Process'
        )}
      </button>
    </div>
  );
}
