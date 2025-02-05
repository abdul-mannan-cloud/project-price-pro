import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Category } from "@/types/estimate";
import { findBestMatchingCategory } from "@/utils/categoryMatcher";

interface CategoryGridProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string) => void;
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

  useEffect(() => {
    const findMatch = async () => {
      if (description) {
        const match = await findBestMatchingCategory(description);
        if (match) {
          console.log('Found matching category:', match);
          setMatchedCategory(match.categoryId);
          onSelectCategory(match.categoryId);
        }
      }
    };

    findMatch();
  }, [description, onSelectCategory]);

  return (
    <div className="space-y-6">
      {!matchedCategory && description && (
        <p className="text-center text-muted-foreground">
          We couldn't determine what you were trying to say. Please select a category that you need help with.
        </p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                selectedCategory === category.id && "border-primary bg-primary/5",
                isCollapsed && "opacity-50 pointer-events-none"
              )}
              onClick={() => onSelectCategory(category.id)}
            >
              {selectedCategory === category.id && (
                <motion.div
                  className="absolute inset-0 bg-primary/5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
              <div className="relative z-10">
                <h3 className={cn(
                  "font-medium mb-2 transition-colors duration-200",
                  selectedCategory === category.id && "text-primary"
                )}>
                  {category.name}
                </h3>
                <p className={cn(
                  "text-sm text-muted-foreground transition-colors duration-200",
                  selectedCategory === category.id && "text-primary/80"
                )}>
                  {category.description || "Select this option"}
                </p>
              </div>
              <div className="absolute left-0 top-0 h-full w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-top" />
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};