import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Category } from "@/types/estimate";
import { findBestMatchingCategory } from "@/utils/categoryMatcher";

interface CategoryGridProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryIds: string[]) => void;
  description?: string;
  completedCategories?: string[];
  contractorSettings?: {
    ai_instructions: string;
    ai_preferences: any;
    ai_prompt_template: string;
    created_at: string;
    excluded_categories: string[];
    id: string;
    markup_percentage: number;
    minimum_project_cost: number;
    tax_rate: number;
    updated_at: string;
  };
  isCollapsed?: boolean;
}

export const CategoryGrid = ({
  categories,
  selectedCategory,
  onSelectCategory,
  description,
  completedCategories = [],
  contractorSettings,
  isCollapsed = false,
}: CategoryGridProps) => {
  const [matchedCategory, setMatchedCategory] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  );

  // useEffect(() => {
  //   const findMatch = async () => {
  //     if (description) {
  //       const match = await findBestMatchingCategory(description);
  //       if (match) {
  //         console.log('Found matching category:', match);
  //         setMatchedCategory(match.categoryId);
  //         onSelectCategory(match.categoryId);
  //       }
  //     }
  //   };
  //
  //   findMatch();
  // }, [description, onSelectCategory]);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleContinue = () => {
    // Convert Set to Array and sort based on the original categories order
    const sortedSelectedCategories = Array.from(selectedCategories).sort(
      (a, b) => {
        const indexA = categories.findIndex((cat) => cat.id === a);
        const indexB = categories.findIndex((cat) => cat.id === b);
        return indexA - indexB;
      },
    );

    if (sortedSelectedCategories.length > 0) {
      onSelectCategory(sortedSelectedCategories); // Start with the first category
    }
  };

  return (
    <div
      className={cn(
        "space-y-6 pb-20 md:pb-24",
        isCollapsed && "hidden", // Hide the grid when collapsed
      )}
    >
      {!matchedCategory && description && (
        <p className="text-center text-muted-foreground">
          We couldn't determine what you were trying to say. Please select
          categories that you need help with.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((category) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card
              className={cn(
                "p-6 cursor-pointer transition-all duration-200",
                "hover:shadow-lg hover:scale-[1.02] hover:border-primary/50",
                "relative overflow-hidden group",
                selectedCategories.has(category.id) &&
                  "border-primary bg-primary/5",
                isCollapsed && "opacity-50 pointer-events-none",
              )}
              onClick={() => handleCategoryClick(category.id)}
            >
              {selectedCategories.has(category.id) && (
                <motion.div
                  className="absolute inset-0 bg-primary/5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
              <div className="relative z-10">
                <h3
                  className={cn(
                    "font-medium mb-2 transition-colors duration-200",
                    selectedCategories.has(category.id) && "text-primary",
                  )}
                >
                  {category.name}
                </h3>
                <p
                  className={cn(
                    "text-sm text-muted-foreground transition-colors duration-200 hidden sm:block", // Hide on mobile
                    selectedCategories.has(category.id) && "text-primary/80",
                  )}
                >
                  {category.description || "Select this option"}
                </p>
              </div>
              <div className="absolute left-0 top-0 h-full w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-top" />
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Sticky continue button with white background and high z-index */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t p-4 transition-transform duration-200 z-50",
          selectedCategories.size > 0 ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="container max-w-7xl mx-auto">
          <div className="flex flex-col gap-2">
            {selectedCategories.size > 0 && (
              <div className="text-sm text-muted-foreground">
                Selected categories:{" "}
                {Array.from(selectedCategories)
                  .map((id) => categories.find((c) => c.id === id)?.name)
                  .join(", ")}
              </div>
            )}
            <Button onClick={handleContinue} className="w-full" size="lg">
              Continue with {selectedCategories.size}{" "}
              {selectedCategories.size === 1 ? "category" : "categories"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
