'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ScoreBadge from './ScoreBadge';

function formatPrice(val) {
  if (!val) return '$0';
  return '$' + Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function ScoreBar({ label, score, max, color }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-gray-500 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-gray-600 font-medium">{score}</span>
    </div>
  );
}

export default function OpportunityCard({ opportunity, onStatusChange }) {
  const router = useRouter();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [localStatus, setLocalStatus] = useState(opportunity.status);
  const [localRejectReason, setLocalRejectReason] = useState(null);

  const opp = opportunity;
  const priceDrop = opp.original_list_price && opp.list_price < opp.original_list_price
    ? Math.round(((opp.original_list_price - opp.list_price) / opp.original_list_price) * 100)
    : null;

  async function handleConfirm(e) {
    e.stopPropagation();
    const res = await fetch(`/api/opportunities/${opp.id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'confirmed_flip' })
    });
    if (res.ok) {
      setLocalStatus('Confirmed');
      if (onStatusChange) onStatusChange(opp.id, 'Confirmed');
    }
  }

  async function handleReject(e) {
    e.stopPropagation();
    if (!rejectReason) return;
    const res = await fetch(`/api/opportunities/${opp.id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'rejected', rejection_reason: rejectReason, notes: rejectNotes })
    });
    if (res.ok) {
      setLocalStatus('Rejected');
      setLocalRejectReason(rejectReason);
      setShowRejectModal(false);
      if (onStatusChange) onStatusChange(opp.id, 'Rejected');
    }
  }

  const isConfirmed = localStatus === 'Confirmed';
  const isRejected = localStatus === 'Rejected';

  return (
    <>
      <div
        onClick={() => router.push(`/opportunities/${opp.id}`)}
        className={`bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer overflow-hidden ${
          isConfirmed ? 'ring-2 ring-green-400' : isRejected ? 'opacity-60' : ''
        }`}
      >
        {isConfirmed && (
          <div className="bg-green-500 text-white text-xs font-semibold text-center py-1">Confirmed Flip</div>
        )}
        {isRejected && (
          <div className="bg-gray-500 text-white text-xs font-semibold text-center py-1">
            Rejected{localRejectReason ? ` — ${localRejectReason}` : ''}
          </div>
        )}

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{opp.address}</h3>
              <p className="text-sm text-gray-500">{opp.city} {opp.zip_code}</p>
            </div>
            <ScoreBadge type="bucket" value={opp.bucket} />
          </div>

          {/* Price & Details */}
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-2xl font-bold text-gray-900">{formatPrice(opp.list_price)}</span>
            <span className="text-sm text-gray-500">
              {opp.bedrooms || '—'} bd · {opp.bathrooms || '—'} ba · {opp.sqft ? opp.sqft.toLocaleString() : '—'} sqft
            </span>
          </div>

          {/* Score Breakdown */}
          <div className="space-y-1.5 mb-3">
            <ScoreBar label="Price Pos." score={opp.price_position_score} max={40} color="bg-blue-500" />
            <ScoreBar label="$/SqFt" score={opp.ppsqft_score} max={20} color="bg-indigo-500" />
            <ScoreBar label="Distress" score={opp.distress_score} max={25} color="bg-red-500" />
            <ScoreBar label="Timing" score={opp.timing_score} max={20} color="bg-green-500" />
          </div>

          {/* Total Score */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-wrap gap-1">
              {opp.distress_keywords_found && opp.distress_keywords_found.split(', ').filter(Boolean).map((kw) => (
                <span key={kw} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{kw}</span>
              ))}
            </div>
            <div className="text-2xl font-bold text-gray-900">{opp.total_score}</div>
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
            <span>{opp.days_on_market != null ? `${opp.days_on_market} days on market` : ''}</span>
            {priceDrop && (
              <span className="text-red-500 font-medium">↓ {priceDrop}% from original</span>
            )}
          </div>

          {/* Actions */}
          {!isConfirmed && !isRejected && (
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: '#16a34a' }}
              >
                ✓ Confirm Flip
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowRejectModal(true); }}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: '#dc2626' }}
              >
                ✗ Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Opportunity</h3>
            <p className="text-sm text-gray-500 mb-3">{opp.address}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (required)</label>
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
            >
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
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button
                onClick={handleReject}
                disabled={!rejectReason}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: '#dc2626' }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
