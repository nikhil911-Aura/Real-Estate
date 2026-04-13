export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
      <div className="flex gap-3 mb-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-gray-200 rounded-lg w-36" />)}
      </div>
      <div className="h-12 bg-gray-200 rounded-xl mb-6" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-5 bg-gray-200 rounded w-48" />
              <div className="h-6 bg-gray-200 rounded-full w-20" />
            </div>
            <div className="h-8 bg-gray-200 rounded w-32" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map(j => <div key={j} className="h-2 bg-gray-100 rounded-full" />)}
            </div>
            <div className="flex gap-2">
              <div className="h-10 bg-gray-200 rounded-lg flex-1" />
              <div className="h-10 bg-gray-200 rounded-lg flex-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
