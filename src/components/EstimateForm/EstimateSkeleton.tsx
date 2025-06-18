export const EstimateSkeleton = () => {
  return (
    <div className="card bg-white p-4 md:p-8 max-w-5xl mx-auto animate-pulse">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-24 h-24 bg-gray-200 rounded-lg" />
        <div className="space-y-2">
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-32 bg-gray-200 rounded" />
        </div>
      </div>

      <div className="space-y-6">
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-20 w-full bg-gray-200 rounded" />
      </div>

      <div className="mt-8 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <div className="h-6 w-1/3 bg-gray-200 rounded" />
            <div className="space-y-3">
              <div className="h-12 w-full bg-gray-200 rounded" />
              <div className="h-12 w-full bg-gray-200 rounded" />
              <div className="h-12 w-full bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t space-y-4">
        <div className="flex justify-between">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
        <div className="flex justify-between pt-4 border-t">
          <div className="h-6 w-32 bg-gray-200 rounded" />
          <div className="h-6 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
};
