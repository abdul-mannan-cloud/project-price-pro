import { Category } from "@/types/estimate";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CategoryGridProps {
  categories: Category[];
  selectedCategory?: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryGrid = ({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((category) => (
        <Card
          key={category.id}
          className={cn(
            "p-6 cursor-pointer transition-all hover:shadow-md",
            selectedCategory === category.id
              ? "border-primary bg-primary/5"
              : "hover:border-gray-300"
          )}
          onClick={() => onSelectCategory(category.id)}
        >
          <h3 className="text-lg font-semibold mb-2">{category.name}</h3>
          {category.description && (
            <p className="text-sm text-muted-foreground">{category.description}</p>
          )}
        </Card>
      ))}
    </div>
  );
};