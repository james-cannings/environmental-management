'use client';

import { useEffect, useState } from 'react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface ConfigData {
  activities: { id: string; categoryName: string; subcategoryName: string; activityName: string; activityId: number }[];
  calcMethods: { id: string; key: string; cozeroId: number; label: string | null }[];
  units: { id: string; key: string; cozeroId: number; label: string | null }[];
  territories: { id: string; countryCode: string; cozeroId: number; countryName: string | null }[];
}

export default function SettingsPage(): React.ReactElement {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activities' | 'methods' | 'units' | 'territories'>('activities');

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const res = await fetch('/api/config');
        const data = await res.json() as ConfigData;
        setConfig(data);
      } catch {
        // Show empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" label="Loading configuration..." />
      </div>
    );
  }

  const tabs = [
    { key: 'activities' as const, label: 'Activities', count: config?.activities.length ?? 0 },
    { key: 'methods' as const, label: 'Calculation Methods', count: config?.calcMethods.length ?? 0 },
    { key: 'units' as const, label: 'Units', count: config?.units.length ?? 0 },
    { key: 'territories' as const, label: 'Territories', count: config?.territories.length ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-black">Settings</h1>

      <p className="text-sm text-gray-600">
        Configuration reference data loaded from the database. Modify via the seed script or CSV import.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-[#0000EB] text-[#0000EB]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {activeTab === 'activities' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Subcategory</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Activity</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Cozero ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {config?.activities.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">{a.categoryName}</td>
                  <td className="px-4 py-2 text-sm">{a.subcategoryName}</td>
                  <td className="px-4 py-2 text-sm font-medium">{a.activityName}</td>
                  <td className="px-4 py-2 text-sm font-mono text-gray-500">{a.activityId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'methods' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Key</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Label</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Cozero ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {config?.calcMethods.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-mono">{m.key}</td>
                  <td className="px-4 py-2 text-sm">{m.label}</td>
                  <td className="px-4 py-2 text-sm font-mono text-gray-500">{m.cozeroId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'units' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Key</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Label</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Cozero ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {config?.units.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-mono">{u.key}</td>
                  <td className="px-4 py-2 text-sm">{u.label}</td>
                  <td className="px-4 py-2 text-sm font-mono text-gray-500">{u.cozeroId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'territories' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Country Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Country Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Cozero ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {config?.territories.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-mono">{t.countryCode}</td>
                  <td className="px-4 py-2 text-sm">{t.countryName}</td>
                  <td className="px-4 py-2 text-sm font-mono text-gray-500">{t.cozeroId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
