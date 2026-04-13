'use client';

import { useState, useEffect, useCallback } from 'react';
import ScoreBadge from '../../components/ScoreBadge';

function formatPrice(val) {
  if (!val) return '$0';
  return '$' + Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function FlipsPage() {
  const [flips, setFlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tier, setTier] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [county, setCounty] = useState('');
  const [selectedFlip, setSelectedFlip] = useState(null);

  const fetchFlips = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tier) params.set('tier', tier);
    if (zipCode) params.set('zip_code', zipCode);
    if (county) params.set('county', county);
    params.set('page', page);
    params.set('limit', '50');

    try {
      const res = await fetch(`/api/flips?${params}`);
      const data = await res.json();
      setFlips(data.flips || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch flips:', err);
    }
    setLoading(false);
  }, [tier, zipCode, county, page]);

  useEffect(() => { fetchFlips(); }, [fetchFlips]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Flip History</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-4">
        <select value={tier} onChange={e => { setTier(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Tiers</option>
          <option value="A">Tier A</option>
          <option value="B">Tier B</option>
          <option value="C">Tier C</option>
          <option value="D">Tier D</option>
        </select>
        <input
          type="text"
          placeholder="ZIP Code"
          value={zipCode}
          onChange={e => { setZipCode(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-28"
        />
        <input
          type="text"
          placeholder="County"
          value={county}
          onChange={e => { setCounty(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-36"
        />
        <button
          onClick={() => { setTier(''); setZipCode(''); setCounty(''); setPage(1); }}
          className="text-sm text-blue-500 hover:text-blue-700"
        >
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Address</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">ZIP</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Tier</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Buy Price</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Sell Price</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Spread</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Hold Days</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Buy Date</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Sell Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-500">Loading...</td></tr>
              ) : flips.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-500">No flips found. Upload historical data first.</td></tr>
              ) : flips.map((flip) => (
                <tr
                  key={flip.id}
                  onClick={() => setSelectedFlip(selectedFlip?.id === flip.id ? null : flip)}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{flip.address}</td>
                  <td className="px-4 py-3 text-gray-600">{flip.zip_code}</td>
                  <td className="px-4 py-3 text-center"><ScoreBadge type="tier" value={flip.tier} /></td>
                  <td className="px-4 py-3 text-right">{formatPrice(flip.buy_price)}</td>
                  <td className="px-4 py-3 text-right">{formatPrice(flip.sell_price)}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatPrice(flip.price_spread)}</td>
                  <td className="px-4 py-3 text-right">{flip.hold_days}</td>
                  <td className="px-4 py-3 text-gray-600">{flip.closed_date_buy}</td>
                  <td className="px-4 py-3 text-gray-600">{flip.closed_date_sell}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50">Previous</button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50">Next</button>
        </div>
      )}

      {/* Slide-out Panel */}
      {selectedFlip && (
        <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto border-l border-gray-200">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedFlip.address}</h2>
                <p className="text-sm text-gray-500">{selectedFlip.city} {selectedFlip.zip_code} · {selectedFlip.county}</p>
              </div>
              <button onClick={() => setSelectedFlip(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <ScoreBadge type="tier" value={selectedFlip.tier} />
              <span className="text-2xl font-bold text-green-600">{formatPrice(selectedFlip.price_spread)}</span>
              <span className="text-sm text-gray-500">spread</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Buy Price</p>
                <p className="font-bold">{formatPrice(selectedFlip.buy_price)}</p>
                <p className="text-xs text-gray-400">{selectedFlip.closed_date_buy}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Sell Price</p>
                <p className="font-bold">{formatPrice(selectedFlip.sell_price)}</p>
                <p className="text-xs text-gray-400">{selectedFlip.closed_date_sell}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Hold Days</p>
                <p className="font-bold">{selectedFlip.hold_days}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">SqFt</p>
                <p className="font-bold">{selectedFlip.sqft || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Year Built</p>
                <p className="font-bold">{selectedFlip.year_built || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Bedrooms</p>
                <p className="font-bold">{selectedFlip.bedrooms || '—'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Distress Signals: {selectedFlip.distress_signals}</h3>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Renovation Signals: {selectedFlip.reno_signals}</h3>
              </div>
              {selectedFlip.buy_remarks && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Buy Remarks</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedFlip.buy_remarks}</p>
                </div>
              )}
              {selectedFlip.sell_remarks && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Sell Remarks</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedFlip.sell_remarks}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
