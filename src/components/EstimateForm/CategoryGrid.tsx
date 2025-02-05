import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Category } from "@/types/estimate";
import { AnimatePresence, motion } from "framer-motion";

export interface CategoryGridProps {
  categories: Category[];
  selectedCategory?: string;
  onSelectCategory: (categoryId: string) => void;
  completedCategories?: string[];
  contractorSettings?: {
    excluded_categories?: string[];
  };
  isCollapsed?: boolean;
}

export const CategoryGrid = ({
  categories,
  selectedCategory,
  onSelectCategory,
  completedCategories = [],
  contractorSettings,
  isCollapsed = false,
}: CategoryGridProps) => {
  // Filter out excluded categories if contractor settings are provided
  const availableCategories = categories.filter(
    (category) => {
      const isNotCompleted = !completedCategories.includes(category.id);
      const isNotExcluded = !contractorSettings?.excluded_categories?.includes(category.id);
      return isNotCompleted && isNotExcluded;
    }
  );

  return (
    <AnimatePresence>
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-4"
        >
          {availableCategories.map((category) => (
            <motion.div
              key={category.id}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card
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
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};