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
          className="space-y-6"
        >
          <div className="text-center">
            <p className="text-lg text-muted-foreground">
              We couldn't determine what you were trying to say. Please select a category that you need help with.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
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
                    "p-6 cursor-pointer transition-all duration-200",
                    "hover:shadow-lg hover:scale-[1.02] hover:border-primary/50",
                    "relative overflow-hidden group",
                    selectedCategory === category.id && "border-primary bg-primary/5"
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};