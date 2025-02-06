
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
        "cursor-pointer transition-all hover:text-primary border-b border-gray-100 last:border-0 pb-4",
        showImage ? "py-4" : "py-3",
      )}
    >
      {showImage && option.image_url && (
        <div className="w-full h-32 relative mb-2">
          <img
            src={option.image_url}
            alt={option.label}
            className="rounded-md w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex items-center gap-3 w-full">
        {type === 'multiple_choice' ? (
          <div className={cn(
            "flex-shrink-0 h-6 w-6 rounded border mt-0.5",
            isSelected ? "bg-primary border-primary" : "border-gray-300",
            "flex items-center justify-center"
          )}>
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </div>
        ) : (
          <div className={cn(
            "flex-shrink-0 h-6 w-6 rounded-full border mt-0.5",
            isSelected ? "bg-primary border-primary" : "border-gray-300"
          )}>
            {isSelected && (
              <div className="w-3 h-3 rounded-full bg-white m-1" />
            )}
          </div>
        )}
        <div className="flex flex-col w-full">
          <span className={cn(
            "text-lg flex-grow",
            isSelected && "text-primary font-medium"
          )}>{option.label}</span>
        </div>
      </div>
    </div>
  );
};
