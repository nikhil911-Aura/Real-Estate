const bucketStyles = {
  HOT: 'bg-red-500 text-white',
  UNDERWRITE: 'bg-orange-500 text-white',
  WATCH: 'bg-yellow-400 text-gray-900',
  SUPPRESSED: 'bg-gray-500 text-white',
};

const tierStyles = {
  A: 'bg-green-500 text-white',
  B: 'bg-blue-500 text-white',
  C: 'bg-amber-500 text-white',
  D: 'bg-gray-400 text-white',
};

export default function ScoreBadge({ type = 'bucket', value }) {
  const styles = type === 'tier' ? tierStyles : bucketStyles;
  const className = styles[value] || 'bg-gray-300 text-gray-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {type === 'tier' ? `Tier ${value}` : value}
    </span>
  );
}
