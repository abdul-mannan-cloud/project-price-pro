import React, { useState, useEffect } from "react";
import { CategoryGrid } from "./CategoryGrid";
import { Category } from "@/types/estimate";

interface CategorySelectionStepProps {
  categories: Category[];
  selectedCategory?: string | null;
  completedCategories: string[];
  onSelectCategory: (categoryIds: string[]) => void;
  description?: string;
}

export const CategorySelectionStep = ({
  categories,
  selectedCategory,
  completedCategories,
  onSelectCategory,
  description
}: CategorySelectionStepProps) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    selectedCategory ? [selectedCategory] : []
  );

  // Log component mounting and props
  useEffect(() => {
    console.log("CategorySelectionStep mounted with categories:", categories.length);
    console.log("Initial selectedCategory:", selectedCategory);
  }, []);

  // Update local state when selectedCategory prop changes
  useEffect(() => {
    if (selectedCategory && !selectedCategories.includes(selectedCategory)) {
      console.log("Updating selectedCategories from prop:", selectedCategory);
      setSelectedCategories([selectedCategory]);
    }
  }, [selectedCategory]);

  // Handle when categories are selected in the CategoryGrid
  const handleCategorySelect = (categoryIds: string[]) => {
    console.log("CategorySelectionStep - Selected categories:", categoryIds);
    
    // Update local state
    setSelectedCategories(categoryIds);
    
    // Send to parent component which will process question sets
    if (categoryIds.length > 0) {
      console.log("CategorySelectionStep - Calling parent onSelectCategory with:", categoryIds);
      onSelectCategory(categoryIds);
    }
  };

  // If no categories are available yet, show loading message
  if (!categories || categories.length === 0) {
    return (
      <div className="animate-fadeIn">
        <h2 className="text-2xl font-semibold mb-2">Select Service Category</h2>
        <p className="text-muted-foreground mb-6">
          Loading available service categories...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <h2 className="text-2xl font-semibold mb-2">Select Service Category</h2>
      <p className="text-muted-foreground mb-6">
        Please select the category for which you need help with.
      </p>
      <CategoryGrid 
        categories={categories}
        selectedCategory={selectedCategory || selectedCategories[0] || null}
        onSelectCategory={handleCategorySelect}
        completedCategories={completedCategories}
        description={description}
      />
    </div>
  );
};