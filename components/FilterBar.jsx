'use client';

export default function FilterBar({ filters, onFilterChange, zipCodes = [] }) {
  const bucketTabs = ['All', 'HOT', 'UNDERWRITE', 'WATCH'];
  const statusTabs = ['New', 'Under Review', 'Confirmed', 'Rejected'];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        {/* Bucket Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {bucketTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onFilterChange({ ...filters, bucket: tab })}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filters.bucket === tab
                  ? 'bg-white text-gray-900 shadow-sm font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ZIP Code */}
        <select
          value={filters.zip_code || ''}
          onChange={(e) => onFilterChange({ ...filters, zip_code: e.target.value || null })}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="">All ZIPs</option>
          {zipCodes.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>

        {/* Price Range */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min $"
            value={filters.min_price || ''}
            onChange={(e) => onFilterChange({ ...filters, min_price: e.target.value || null })}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-28"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            placeholder="Max $"
            value={filters.max_price || ''}
            onChange={(e) => onFilterChange({ ...filters, max_price: e.target.value || null })}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-28"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onFilterChange({ ...filters, status: filters.status === tab ? null : tab })}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filters.status === tab
                  ? 'bg-white text-gray-900 shadow-sm font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Reset */}
        <button
          onClick={() => onFilterChange({ bucket: 'All', zip_code: null, min_price: null, max_price: null, status: null })}
          className="text-sm text-blue-500 hover:text-blue-700"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
