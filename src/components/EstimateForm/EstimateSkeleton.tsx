
import { Skeleton } from "@/components/ui/skeleton"

export const EstimateSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
      
      {/* Description Section */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-[300px]" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>

      {/* Table Groups */}
      {Array.from({ length: 2 }).map((_, groupIndex) => (
        <div key={groupIndex} className="space-y-4 mt-8">
          {/* Group Header */}
          <Skeleton className="h-6 w-[200px]" />
          
          {/* Table */}
          <div className="w-full space-y-3">
            {/* Table Header */}
            <div className="grid grid-cols-5 gap-4">
              <Skeleton className="h-4 col-span-2" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
            </div>
            
            {/* Table Rows */}
            {Array.from({ length: 3 }).map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-5 gap-4">
                <Skeleton className="h-8 col-span-2" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            ))}
            
            {/* Subtotal */}
            <div className="flex justify-end mt-4">
              <Skeleton className="h-6 w-[150px]" />
            </div>
          </div>
        </div>
      ))}

      {/* Main Content Container */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {/* Totals Section */}
        <div className="space-y-4 mt-8 pt-6 border-t">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[120px]" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-4 w-[120px]" />
          </div>
          <div className="flex justify-between pt-4 border-t">
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-6 w-[180px]" />
          </div>
        </div>

        {/* Signatures Section */}
        <div className="mt-8 pt-6 border-t space-y-6">
          <Skeleton className="h-6 w-[150px]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Signature Box */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
            {/* Contractor Signature Box */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <div className="mt-8 pt-6 border-t">
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
};
