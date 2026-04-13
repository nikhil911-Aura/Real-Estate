'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import ScoreBadge from '../../components/ScoreBadge';

function formatPrice(val) {
  if (!val) return '$0';
  return '$' + Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

const TIER_COLORS = { A: '#22c55e', B: '#3b82f6', C: '#f59e0b', D: '#9ca3af' };

export default function MarketPage() {
  const [models, setModels] = useState([]);
  const [stats, setStats] = useState(null);
  const [expandedZip, setExpandedZip] = useState(null);
  const [zipFlips, setZipFlips] = useState({});
  const [zipPage, setZipPage] = useState(1);
  const zipPerPage = 10;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/zip-models').then(r => r.json()),
      fetch('/api/stats').then(r => r.json())
    ]).then(([m, s]) => {
      setModels(m);
      setStats(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleZip = async (zip) => {
    if (expandedZip === zip) {
      setExpandedZip(null);
      return;
    }
    setExpandedZip(zip);
    if (!zipFlips[zip]) {
      const res = await fetch(`/api/flips?zip_code=${zip}&limit=100`);
      const data = await res.json();
      setZipFlips(prev => ({ ...prev, [zip]: data.flips }));
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading market data...</div>;

  const top10 = models.slice(0, 10).map(m => ({ name: m.zip_code, flips: m.flip_count }));
  const tierData = stats ? [
    { name: 'Tier A', count: stats.tier_distribution?.A || 0, color: TIER_COLORS.A },
    { name: 'Tier B', count: stats.tier_distribution?.B || 0, color: TIER_COLORS.B },
    { name: 'Tier C', count: stats.tier_distribution?.C || 0, color: TIER_COLORS.C },
    { name: 'Tier D', count: stats.tier_distribution?.D || 0, color: TIER_COLORS.D },
  ] : [];

  const avgSpread = models.length > 0
    ? models.reduce((sum, m) => sum + (m.median_price_spread || 0), 0) / models.length
    : 0;

  const uniqueCounties = [...new Set(models.map(m => m.county).filter(Boolean))];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Market Intelligence</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total Confirmed Flips</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_flips || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Counties Covered</p>
          <p className="text-2xl font-bold text-gray-900">{uniqueCounties.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">ZIP Models</p>
          <p className="text-2xl font-bold text-gray-900">{models.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Avg Flip Spread</p>
          <p className="text-2xl font-bold text-green-600">{formatPrice(avgSpread)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 10 ZIPs by Flip Count</h2>
          {top10.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="flips" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-sm text-center py-8">No data available</p>}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tier Distribution</h2>
          {tierData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tierData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {tierData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-sm text-center py-8">No data available</p>}
        </div>
      </div>

      {/* ZIP Models Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">ZIP Models</h2>
          <span className="text-sm text-gray-500">{models.length} ZIP codes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">ZIP</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">City</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">County</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Flips</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Median Buy</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Median Spread</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Hold Days</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">A</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">B</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">C</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">D</th>
              </tr>
            </thead>
            <tbody>
              {models.slice((zipPage - 1) * zipPerPage, zipPage * zipPerPage).map((m) => (
                <>
                  <tr
                    key={m.zip_code}
                    onClick={() => toggleZip(m.zip_code)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{m.zip_code}</td>
                    <td className="px-4 py-3 text-gray-600">{m.city}</td>
                    <td className="px-4 py-3 text-gray-600">{m.county}</td>
                    <td className="px-4 py-3 text-right font-semibold">{m.flip_count}</td>
                    <td className="px-4 py-3 text-right">{formatPrice(m.median_buy_price)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{formatPrice(m.median_price_spread)}</td>
                    <td className="px-4 py-3 text-right">{Math.round(m.median_hold_days)}</td>
                    <td className="px-4 py-3 text-center"><span className="text-green-600 font-medium">{m.tier_a_count}</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-blue-600 font-medium">{m.tier_b_count}</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-amber-600 font-medium">{m.tier_c_count}</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-gray-500">{m.tier_d_count}</span></td>
                  </tr>
                  {expandedZip === m.zip_code && zipFlips[m.zip_code] && (
                    <tr key={`${m.zip_code}-expanded`}>
                      <td colSpan={11} className="bg-gray-50 px-6 py-4">
                        <div className="space-y-2">
                          {zipFlips[m.zip_code].map((f) => (
                            <div key={f.id} className="flex items-center gap-4 text-xs bg-white rounded-lg p-3 border border-gray-100">
                              <span className="font-medium text-gray-900 flex-1">{f.address}</span>
                              <ScoreBadge type="tier" value={f.tier} />
                              <span>Buy: {formatPrice(f.buy_price)}</span>
                              <span>Sell: {formatPrice(f.sell_price)}</span>
                              <span className="text-green-600 font-medium">{formatPrice(f.price_spread)}</span>
                              <span>{f.hold_days}d</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {models.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-gray-500">No ZIP models available. Upload historical data first.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {models.length > zipPerPage && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Showing {((zipPage - 1) * zipPerPage) + 1}–{Math.min(zipPage * zipPerPage, models.length)} of {models.length}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setZipPage(p => Math.max(1, p - 1)); setExpandedZip(null); }}
                disabled={zipPage === 1}
                className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {zipPage} of {Math.ceil(models.length / zipPerPage)}
              </span>
              <button
                onClick={() => { setZipPage(p => Math.min(Math.ceil(models.length / zipPerPage), p + 1)); setExpandedZip(null); }}
                disabled={zipPage >= Math.ceil(models.length / zipPerPage)}
                className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
