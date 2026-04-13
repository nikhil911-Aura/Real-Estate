'use client';

import { useState, useEffect, useCallback } from 'react';
import StatsChip from '../../components/StatsChip';
import FilterBar from '../../components/FilterBar';
import OpportunityCard from '../../components/OpportunityCard';

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState([]);
  const [stats, setStats] = useState({});
  const [zipCodes, setZipCodes] = useState([]);
  const [filters, setFilters] = useState({ bucket: 'All', zip_code: null, min_price: null, max_price: null, status: null });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.bucket && filters.bucket !== 'All') params.set('bucket', filters.bucket);
    if (filters.zip_code) params.set('zip_code', filters.zip_code);
    if (filters.min_price) params.set('min_price', filters.min_price);
    if (filters.max_price) params.set('max_price', filters.max_price);
    if (filters.status) params.set('status', filters.status);
    params.set('page', page);
    params.set('limit', '50');

    try {
      const res = await fetch(`/api/opportunities?${params}`);
      const data = await res.json();
      setOpportunities(data.opportunities || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch opportunities:', err);
    }
    setLoading(false);
  }, [filters, page]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data.bucket_counts || {});
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchZipCodes = useCallback(async () => {
    try {
      // Get all unique ZIPs from opportunities, not just zip_models
      const res = await fetch('/api/opportunities?limit=1');
      const statsRes = await fetch('/api/stats');
      const statsData = await statsRes.json();
      // Use top_zips + get distinct zips from a dedicated query
      const zipRes = await fetch('/api/zip-models');
      const zipData = await zipRes.json();
      const zips = [...new Set(zipData.map(z => z.zip_code))].sort();
      setZipCodes(zips);
    } catch (err) {
      console.error('Failed to fetch ZIP codes:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchZipCodes();
  }, [fetchStats, fetchZipCodes]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleStatusChange = (id, newStatus) => {
    setOpportunities(prev =>
      prev.map(opp => opp.id === id ? { ...opp, status: newStatus } : opp)
    );
    fetchStats();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Opportunities</h1>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <StatsChip label="HOT" count={stats.HOT || 0} type="HOT" />
        <StatsChip label="UNDERWRITE" count={stats.UNDERWRITE || 0} type="UNDERWRITE" />
        <StatsChip label="WATCH" count={stats.WATCH || 0} type="WATCH" />
        <StatsChip label="SUPPRESSED" count={stats.SUPPRESSED || 0} type="SUPPRESSED" />
      </div>

      {/* Filter Bar */}
      <div className="mb-6">
        <FilterBar filters={filters} onFilterChange={handleFilterChange} zipCodes={zipCodes} stats={stats} />
      </div>

      {/* Opportunity Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading opportunities...</div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No opportunities found</p>
          <p className="text-gray-400 text-sm mt-1">Upload data from the Upload page to get started</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {opportunities.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} onStatusChange={handleStatusChange} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
