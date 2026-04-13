'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ScoreBadge from '../../../components/ScoreBadge';

function formatPrice(val) {
  if (!val) return '$0';
  return '$' + Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function DealDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');

  useEffect(() => {
    fetch(`/api/opportunities/${id}`)
      .then(res => res.json())
      .then(d => { setData(d); setStatus(d.opportunity?.status); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!data || !data.opportunity) return <div className="text-center py-12 text-gray-500">Not found</div>;

  const opp = data.opportunity;
  const comps = data.comps || [];
  const zipModel = data.zip_model;

  const priceDrop = opp.original_list_price && opp.list_price < opp.original_list_price
    ? Math.round(((opp.original_list_price - opp.list_price) / opp.original_list_price) * 100)
    : null;

  async function handleConfirm() {
    const res = await fetch(`/api/opportunities/${id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'confirmed_flip' })
    });
    if (res.ok) setStatus('Confirmed');
  }

  async function handleReject() {
    if (!rejectReason) return;
    const res = await fetch(`/api/opportunities/${id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'rejected', rejection_reason: rejectReason, notes: rejectNotes })
    });
    if (res.ok) { setStatus('Rejected'); setShowRejectModal(false); }
  }

  const scoreRows = [
    { component: 'Price Position', earned: opp.price_position_score, max: 40, reason: opp.price_position_score >= 25 ? 'Below ZIP median buy price' : opp.price_position_score >= 10 ? 'Within ZIP typical range' : 'Above ZIP typical range' },
    { component: '$/SqFt', earned: opp.ppsqft_score, max: 20, reason: opp.ppsqft_score >= 12 ? 'Below median $/sqft' : opp.ppsqft_score >= 5 ? 'Near median $/sqft' : 'At or above median $/sqft' },
    { component: 'Distress Signals', earned: opp.distress_score, max: 25, reason: opp.distress_keywords_found ? `Keywords: ${opp.distress_keywords_found}` : 'No distress keywords found' },
    { component: 'Market Timing', earned: opp.timing_score, max: 20, reason: opp.days_on_market != null ? `Listed ${opp.days_on_market} days ago` : 'No list date' },
  ];

  return (
    <div>
      <button onClick={() => router.back()} className="text-sm text-blue-500 hover:text-blue-700 mb-4 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Opportunities
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Property Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{opp.address}</h1>
                <p className="text-sm text-gray-500">{opp.city}, {opp.zip_code} · {opp.county}</p>
              </div>
              <ScoreBadge type="bucket" value={opp.bucket} />
            </div>

            {status === 'Confirmed' && <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 text-center font-medium">Confirmed Flip</div>}
            {status === 'Rejected' && <div className="mb-4 p-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 text-center font-medium">Rejected</div>}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-500">List Price</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(opp.list_price)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Original List Price</p>
                <p className="text-lg text-gray-700">{formatPrice(opp.original_list_price)}</p>
                {priceDrop && <p className="text-xs text-red-500 font-medium">↓ {priceDrop}% price drop</p>}
              </div>
              <div><p className="text-xs text-gray-500">Year Built</p><p className="font-semibold">{opp.year_built || '—'}</p></div>
              <div><p className="text-xs text-gray-500">SqFt</p><p className="font-semibold">{opp.sqft ? opp.sqft.toLocaleString() : '—'}</p></div>
              <div><p className="text-xs text-gray-500">Beds / Baths</p><p className="font-semibold">{opp.bedrooms || '—'} / {opp.bathrooms || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Days on Market</p><p className="font-semibold">{opp.days_on_market ?? '—'}</p></div>
              <div><p className="text-xs text-gray-500">List Date</p><p className="font-semibold">{opp.list_date || '—'}</p></div>
              <div><p className="text-xs text-gray-500">$/SqFt</p><p className="font-semibold">{opp.list_price_per_sqft ? `$${opp.list_price_per_sqft.toFixed(0)}` : '—'}</p></div>
            </div>

            {/* Distress Tags */}
            {opp.distress_keywords_found && (
              <div className="flex flex-wrap gap-1 mb-4">
                {opp.distress_keywords_found.split(', ').filter(Boolean).map(kw => (
                  <span key={kw} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">{kw}</span>
                ))}
              </div>
            )}
          </div>

          {/* Score Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Score Breakdown</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">Component</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Points</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Max</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {scoreRows.map(row => (
                  <tr key={row.component} className="border-b border-gray-50">
                    <td className="py-2 font-medium text-gray-900">{row.component}</td>
                    <td className="py-2 text-center font-semibold text-blue-600">{row.earned}</td>
                    <td className="py-2 text-center text-gray-400">{row.max}</td>
                    <td className="py-2 text-gray-500 text-xs">{row.reason}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td className="py-2 font-bold text-gray-900">Total</td>
                  <td className="py-2 text-center font-bold text-xl text-gray-900">{opp.total_score}</td>
                  <td className="py-2 text-center text-gray-400">105</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Actions */}
          {status !== 'Confirmed' && status !== 'Rejected' && (
            <div className="flex gap-3">
              <button onClick={handleConfirm} className="flex-1 py-3 rounded-xl text-white font-medium" style={{ backgroundColor: '#16a34a' }}>
                ✓ Confirm Flip
              </button>
              <button onClick={() => setShowRejectModal(true)} className="flex-1 py-3 rounded-xl text-white font-medium" style={{ backgroundColor: '#dc2626' }}>
                ✗ Reject
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Comps */}
        <div className="space-y-6">
          {zipModel && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Top Comps from ZIP {opp.zip_code}</h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Median Buy</p>
                  <p className="font-bold text-gray-900">{formatPrice(zipModel.median_buy_price)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Median Spread</p>
                  <p className="font-bold text-green-600">{formatPrice(zipModel.median_price_spread)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Median Hold Days</p>
                  <p className="font-bold text-gray-900">{Math.round(zipModel.median_hold_days)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Based on</p>
                  <p className="font-bold text-gray-900">{zipModel.flip_count} flips</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium">Suggested Buy Range</p>
                <p className="text-lg font-bold text-blue-800">
                  {formatPrice(zipModel.typical_buy_price_low)} – {formatPrice(zipModel.typical_buy_price_high)}
                </p>
              </div>
            </div>
          )}

          {opp.no_zip_model === 1 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
              No ZIP model available for this area. Scores may be limited.
            </div>
          )}

          {comps.length > 0 ? comps.map((comp, i) => (
            <div key={comp.id || i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">{comp.address}</h3>
                <ScoreBadge type="tier" value={comp.tier} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div>
                  <p className="text-xs text-gray-500">Bought</p>
                  <p className="font-semibold">{formatPrice(comp.buy_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Sold</p>
                  <p className="font-semibold">{formatPrice(comp.sell_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Spread</p>
                  <p className="font-semibold text-green-600">{formatPrice(comp.price_spread)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Held {comp.hold_days} days · {comp.closed_date_buy} → {comp.closed_date_sell}</p>
              {comp.buy_remarks && (
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">Buy: {comp.buy_remarks.slice(0, 150)}</p>
              )}
              {comp.sell_remarks && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">Sell: {comp.sell_remarks.slice(0, 150)}</p>
              )}
            </div>
          )) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500 text-sm">
              No comparable flips found for this ZIP code
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Opportunity</h3>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (required)</label>
            <select value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3">
              <option value="">Select reason...</option>
              <option value="Price too high">Price too high</option>
              <option value="Bad location">Bad location</option>
              <option value="Too much work needed">Too much work needed</option>
              <option value="Poor comps">Poor comps</option>
              <option value="Already under contract">Already under contract</option>
              <option value="Not a flip opportunity">Not a flip opportunity</option>
              <option value="Other">Other</option>
            </select>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4" rows={3} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason} className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: '#dc2626' }}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
