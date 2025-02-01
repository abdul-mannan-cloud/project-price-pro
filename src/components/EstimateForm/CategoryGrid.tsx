import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Category } from "@/types/estimate";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [categoryKeywords, setCategoryKeywords] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCategoryKeywords();
  }, []);

  const loadCategoryKeywords = async () => {
    try {
      setIsLoading(true);
      const { data: optionsData, error } = await supabase
        .from('Options')
        .select('*')
        .eq('Key Options', '42e64c9c-53b2-49bd-ad77-995ecb3106c6')
        .maybeSingle();

      if (error) {
        console.error('Error fetching options:', error);
        toast({
          title: "Error loading categories",
          description: "Failed to load category details. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (!optionsData) {
        console.warn('No options data found');
        return;
      }

      // Extract keywords for each category
      const keywords: Record<string, string[]> = {};
      Object.entries(optionsData).forEach(([category, data]) => {
        if (category !== 'Key Options' && data && typeof data === 'object') {
          try {
            const categoryData = data as { keywords?: string[] };
            if (Array.isArray(categoryData.keywords)) {
              keywords[category] = categoryData.keywords;
            }
          } catch (err) {
            console.error(`Error processing keywords for category ${category}:`, err);
          }
        }
      });

      setCategoryKeywords(keywords);
    } catch (error) {
      console.error('Error loading category keywords:', error);
      toast({
        title: "Error",
        description: "Failed to load category information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
                {categoryKeywords[category.name]?.slice(0, 3).map((keyword) => (
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
              disabled={isLoading}
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