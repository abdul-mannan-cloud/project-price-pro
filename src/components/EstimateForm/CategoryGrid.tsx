import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Category } from "@/types/estimate";

export interface CategoryGridProps {
  categories: Category[];
  selectedCategory?: string;
  onSelectCategory: (categoryId: string) => void;
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
            "p-6 cursor-pointer hover:shadow-lg transition-shadow",
            selectedCategory === category.id && "border-primary"
          )}
          onClick={() => onSelectCategory(category.id)}
        >
          <h3 className="font-medium mb-2">{category.name}</h3>
          <p className="text-sm text-muted-foreground">
            {category.description || "Select this option"}
          </p>
        </Card>
      ))}
    </div>
  );
};