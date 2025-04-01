import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Option } from "@/types/estimate";

interface QuestionOptionProps {
  option: Option;
  isSelected: boolean;
  type: 'multiple_choice' | 'single_choice' | 'yes_no';
  onClick: () => void;
  showImage: boolean;
}

export const QuestionOption = ({
                                 option,
                                 isSelected,
                                 type,
                                 onClick,
                                 showImage
                               }: QuestionOptionProps) => {
  return (
      <div
          onClick={onClick}
          className={cn(
              "group relative rounded-xl transition-all duration-200 cursor-pointer overflow-hidden",
              isSelected
                  ? "bg-primary-100 ring-2 ring-primary ring-offset-1"
                  : "hover:bg-primary-50 border border-gray-200 hover:border-primary-300",
              showImage ? "pb-4" : "p-4"
          )}
      >
        {showImage && option.image_url && (
            <div className="w-full aspect-video overflow-hidden">
              <img
                  src={option.image_url}
                  alt={option.label}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
        )}

        <div className={cn(
            "flex items-center gap-3 w-full",
            showImage ? "px-4 pt-4" : ""
        )}>
          {type === 'multiple_choice' ? (
              <div className={cn(
                  "flex-shrink-0 h-6 w-6 rounded-md border transition-all duration-200",
                  isSelected
                      ? "bg-primary border-primary"
                      : "border-gray-300 group-hover:border-primary-400",
                  "flex items-center justify-center"
              )}>
                <Check className={cn(
                    "w-4 h-4 text-white transition-all duration-200",
                    isSelected ? "opacity-100 scale-100" : "opacity-0 scale-0"
                )} />
              </div>
          ) : (
              <div className={cn(
                  "flex-shrink-0 h-6 w-6 rounded-full border transition-all duration-200",
                  isSelected
                      ? "border-2 border-primary"
                      : "border-gray-300 group-hover:border-primary-400"
              )}>
                <div className={cn(
                    "w-3 h-3 rounded-full bg-primary m-[3px] transition-all duration-200",
                    isSelected ? "opacity-100 scale-100" : "opacity-0 scale-0"
                )} />
              </div>
          )}

          <div className="flex flex-col w-full">
          <span className={cn(
              "text-base sm:text-lg transition-all duration-200",
              isSelected
                  ? "font-medium text-primary-700"
                  : "text-gray-800 group-hover:text-primary-600"
          )}>
            {option.label}
          </span>

            {option.description && (
                <span className="text-sm text-gray-500 mt-1">
              {option.description}
            </span>
            )}
          </div>
        </div>

        {/* Subtle hover effect overlay */}
        <div className={cn(
            "absolute inset-0 bg-primary-100 opacity-0 pointer-events-none transition-opacity duration-300",
            isSelected ? "opacity-0" : "group-hover:opacity-5"
        )} />
      </div>
  );
};