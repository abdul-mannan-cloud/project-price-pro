
import { CategoryGrid } from "./CategoryGrid";
import { Category } from "@/types/estimate";

interface CategorySelectionStepProps {
  categories: Category[];
  selectedCategory?: string;
  completedCategories: string[];
  onSelectCategory: (categoryIds: string[]) => void
}

export const CategorySelectionStep = ({
  categories,
  selectedCategory,
  completedCategories,
  onSelectCategory
}: CategorySelectionStepProps) => {
  return (
    <div className="animate-fadeIn">
      <h2 className="text-2xl font-semibold mb-2">Select Service Category</h2>
      <p className="text-muted-foreground mb-6">
        Sorry, we did not understand the scope of your project. Please select the category for which you need help with.
      </p>
      <CategoryGrid 
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        completedCategories={completedCategories}
      />
    </div>
  );
};
