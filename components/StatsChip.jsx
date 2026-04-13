const colorMap = {
  HOT: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
  UNDERWRITE: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
  WATCH: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  SUPPRESSED: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', dot: 'bg-gray-400' },
};

export default function StatsChip({ label, count, type }) {
  const colors = colorMap[type] || colorMap.SUPPRESSED;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.bg} ${colors.border}`}>
      <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
      <span className={`text-sm font-medium ${colors.text}`}>{label}</span>
      <span className={`text-lg font-bold ${colors.text}`}>{count}</span>
    </div>
  );
}
