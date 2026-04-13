'use client';

const bucketColors = {
  All: '',
  HOT: 'text-red-600',
  UNDERWRITE: 'text-orange-600',
  WATCH: 'text-yellow-700',
};

export default function FilterBar({ filters, onFilterChange, zipCodes = [], stats = {} }) {
  const bucketTabs = ['All', 'HOT', 'UNDERWRITE', 'WATCH'];
  const statusTabs = ['All Statuses', 'New', 'Confirmed', 'Rejected'];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Label */}
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Bucket</span>

        {/* Bucket Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {bucketTabs.map((tab) => {
            const count = tab === 'All'
              ? (stats.HOT || 0) + (stats.UNDERWRITE || 0) + (stats.WATCH || 0)
              : (stats[tab] || 0);
            return (
              <button
                key={tab}
                onClick={() => onFilterChange({ ...filters, bucket: tab })}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                  filters.bucket === tab
                    ? 'bg-white text-gray-900 shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab}</span>
                <span className={`text-xs ${filters.bucket === tab ? bucketColors[tab] || 'text-gray-500' : 'text-gray-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* ZIP Code */}
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">ZIP</span>
        <select
          value={filters.zip_code || ''}
          onChange={(e) => onFilterChange({ ...filters, zip_code: e.target.value || null })}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
        >
          <option value="">All ZIPs</option>
          {zipCodes.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* Price Range */}
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Price</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min $"
            value={filters.min_price || ''}
            onChange={(e) => onFilterChange({ ...filters, min_price: e.target.value || null })}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-28 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            placeholder="Max $"
            value={filters.max_price || ''}
            onChange={(e) => onFilterChange({ ...filters, max_price: e.target.value || null })}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-28 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
          />
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* Status Tabs */}
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</span>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {statusTabs.map((tab) => {
            const filterVal = tab === 'All Statuses' ? null : tab;
            const isActive = filters.status === filterVal;
            return (
              <button
                key={tab}
                onClick={() => onFilterChange({ ...filters, status: filterVal })}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Reset */}
        <button
          onClick={() => onFilterChange({ bucket: 'All', zip_code: null, min_price: null, max_price: null, status: null })}
          className="ml-auto text-sm text-blue-500 hover:text-blue-700 font-medium"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}
