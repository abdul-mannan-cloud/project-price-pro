export const MultiStepSkeleton = () => {
  return (
    <div className="animate-pulse min-h-screen">
      {/* Tab navigation */}
      <div className="flex px-4 py-2 border-b">
        <div className="flex-1 flex items-center">
          <div className="h-4 w-24 rounded-full" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="h-4 w-16 bg-gray-200 rounded-full" />
        </div>
        <div className="flex-1 flex items-center justify-end">
          <div className="h-4 w-20 bg-gray-200 rounded-full" />
        </div>
      </div>

      {/* Back button */}
      <div className="px-4 py-3">
        <div className="h-5 w-32 bg-gray-200 rounded" />
      </div>

      {/* Main card */}
      <div className="mx-4 bg-white p-6 rounded-lg shadow">
        {/* Icon and title */}
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded mr-3" />
          <div className="space-y-2">
            <div className="h-6 w-40 bg-gray-200 rounded" />
            <div className="h-5 w-32 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Description text */}
        <div className="space-y-2 mb-6">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 rounded" />
          <div className="h-4 w-4/6 bg-gray-200 rounded" />
        </div>

        {/* Upload box */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center mb-4 max-w-[50%]">
          <div className="w-8 h-8 bg-gray-200 rounded-full mb-2" />
          <div className="h-4 w-20 bg-gray-200 rounded mx-auto" />
        </div>

        {/* Skip button */}
        <div className="flex justify-center">
          <div className="h-5 w-20 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
};

export default MultiStepSkeleton;
