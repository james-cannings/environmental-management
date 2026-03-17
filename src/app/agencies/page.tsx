'use client';

import { useEffect, useState } from 'react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface AgencyRecord {
  id: string;
  name: string;
  country: string;
  cozeroLocationId: number | null;
  cozeroBusinessUnitId: number | null;
  cozeroTerritoryId: number | null;
  contactEmail: string | null;
  isActive: boolean;
  dbNames: string | null;
  _count: { uploads: number; processingRuns: number; exclusions: number };
}

export default function AgenciesPage(): React.ReactElement {
  const [agencies, setAgencies] = useState<AgencyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAgencies();
  }, []);

  async function loadAgencies(): Promise<void> {
    try {
      const res = await fetch('/api/agencies');
      const data = await res.json() as AgencyRecord[];
      setAgencies(data);
    } catch {
      // Show empty
    } finally {
      setLoading(false);
    }
  }

  function startEdit(agency: AgencyRecord): void {
    setEditing(agency.id);
    setEditValues({
      cozeroLocationId: agency.cozeroLocationId?.toString() ?? '',
      cozeroBusinessUnitId: agency.cozeroBusinessUnitId?.toString() ?? '',
      cozeroTerritoryId: agency.cozeroTerritoryId?.toString() ?? '',
      contactEmail: agency.contactEmail ?? '',
    });
  }

  async function saveEdit(agencyId: string): Promise<void> {
    setSaving(true);
    try {
      await fetch('/api/agencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: agencyId,
          cozeroLocationId: editValues.cozeroLocationId ? parseInt(editValues.cozeroLocationId, 10) : null,
          cozeroBusinessUnitId: editValues.cozeroBusinessUnitId ? parseInt(editValues.cozeroBusinessUnitId, 10) : null,
          cozeroTerritoryId: editValues.cozeroTerritoryId ? parseInt(editValues.cozeroTerritoryId, 10) : null,
          contactEmail: editValues.contactEmail || null,
        }),
      });
      setEditing(null);
      await loadAgencies();
    } catch {
      // Keep editing state on error
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" label="Loading agencies..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-black">Agencies</h1>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Agency</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Country</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Location ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Business Unit ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Territory ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Uploads</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {agencies.map(agency => (
              <tr key={agency.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{agency.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{agency.country}</td>
                <td className="px-4 py-3 text-sm">
                  {editing === agency.id ? (
                    <input
                      type="number"
                      value={editValues.cozeroLocationId}
                      onChange={e => setEditValues(v => ({ ...v, cozeroLocationId: e.target.value }))}
                      className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  ) : (
                    <span className={agency.cozeroLocationId ? '' : 'text-gray-400'}>
                      {agency.cozeroLocationId ?? 'Not set'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {editing === agency.id ? (
                    <input
                      type="number"
                      value={editValues.cozeroBusinessUnitId}
                      onChange={e => setEditValues(v => ({ ...v, cozeroBusinessUnitId: e.target.value }))}
                      className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  ) : (
                    <span className={agency.cozeroBusinessUnitId ? '' : 'text-gray-400'}>
                      {agency.cozeroBusinessUnitId ?? 'Not set'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {editing === agency.id ? (
                    <input
                      type="number"
                      value={editValues.cozeroTerritoryId}
                      onChange={e => setEditValues(v => ({ ...v, cozeroTerritoryId: e.target.value }))}
                      className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  ) : (
                    <span className={agency.cozeroTerritoryId ? '' : 'text-gray-400'}>
                      {agency.cozeroTerritoryId ?? 'Not set'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">{agency._count.uploads}</td>
                <td className="px-4 py-3 text-sm">
                  {editing === agency.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(agency.id)}
                        disabled={saving}
                        className="text-xs text-[#0000EB] hover:underline"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(agency)}
                      className="text-xs text-[#0000EB] hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
