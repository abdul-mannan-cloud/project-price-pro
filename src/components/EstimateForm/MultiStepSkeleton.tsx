
export const MultiStepSkeleton = () => {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header section */}
      <div className="text-center space-y-4">
        <div className="h-8 w-3/4 bg-gray-200 rounded mx-auto" />
        <div className="h-4 w-1/2 bg-gray-200 rounded mx-auto" />
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6 space-y-4 border">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto" />
            <div className="space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded mx-auto" />
              <div className="h-3 w-1/2 bg-gray-200 rounded mx-auto" />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom navigation */}
      <div className="flex justify-between items-center pt-6">
        <div className="h-10 w-24 bg-gray-200 rounded" />
        <div className="h-10 w-24 bg-gray-200 rounded" />
      </div>
    </div>
  );
};
