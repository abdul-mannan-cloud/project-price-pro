import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Category } from "@/types/estimate";

export interface CategoryGridProps {
  categories: Category[];
  selectedCategory?: string;
  onSelectCategory?: (categoryId: string) => void;
  completedCategories?: string[];
}

export const CategoryGrid = ({
  categories,
  selectedCategory,
  onSelectCategory,
  completedCategories = [],
}: CategoryGridProps) => {
  const availableCategories = categories.filter(
    (category) => !completedCategories.includes(category.id)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {availableCategories.map((category) => (
        <Card
          key={category.id}
          className={cn(
            "p-6 cursor-pointer hover:shadow-lg transition-shadow group",
            selectedCategory === category.id && "border-primary"
          )}
          onClick={() => onSelectCategory?.(category.id)}
        >
          <div className="flex flex-col space-y-4">
            <div>
              <h3 className="font-medium text-lg mb-2">{category.name}</h3>
              <div className="flex flex-wrap gap-2">
                {category.keywords?.slice(0, 3).map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="secondary"
                    className="text-xs"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              className="w-full justify-between group-hover:translate-x-1 transition-transform"
            >
              Start Estimate
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};