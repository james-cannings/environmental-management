'use client';

import { useEffect, useState } from 'react';
import DataTable from '@/components/shared/DataTable';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface SupplierRecord {
  id: string;
  name: string;
  businessActivity: string;
  cozeroSupplierId: number | null;
  source: string | null;
  updatedAt: string;
}

export default function SuppliersPage(): React.ReactElement {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers(): Promise<void> {
    try {
      const res = await fetch('/api/suppliers?limit=1000');
      const data = await res.json() as { suppliers: SupplierRecord[] };
      setSuppliers(data.suppliers);
    } catch {
      // Show empty
    } finally {
      setLoading(false);
    }
  }

  async function handleSync(): Promise<void> {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/suppliers/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createMissing: false }),
      });
      const data = await res.json() as { matched: number; unmatched: number; errors: string[] };
      setSyncResult(`Matched: ${data.matched}, Unmatched: ${data.unmatched}`);
      await loadSuppliers();
    } catch (err) {
      setSyncResult(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" label="Loading suppliers..." />
      </div>
    );
  }

  const columns = [
    { key: 'name', header: 'Supplier Name' },
    { key: 'businessActivity', header: 'Activity' },
    {
      key: 'cozeroSupplierId',
      header: 'Cozero ID',
      render: (row: SupplierRecord) => (
        <span className={row.cozeroSupplierId ? 'text-green-700' : 'text-gray-400'}>
          {row.cozeroSupplierId ?? 'Not synced'}
        </span>
      ),
    },
    { key: 'source', header: 'Source' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-black">Suppliers</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          {syncing ? 'Syncing...' : 'Sync with Cozero'}
        </button>
      </div>

      {syncResult && (
        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">{syncResult}</div>
      )}

      <DataTable<SupplierRecord>
        columns={columns}
        data={suppliers}
        searchable
        searchKeys={['name', 'businessActivity']}
        emptyMessage="No suppliers mapped yet"
      />
    </div>
  );
}
