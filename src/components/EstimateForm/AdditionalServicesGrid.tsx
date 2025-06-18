import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/3d-button";
import { Category } from "@/types/estimate";

interface AdditionalServicesGridProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (categoryId: string) => void;
  onComplete: () => void;
  completedCategories: string[];
}

export const AdditionalServicesGrid = ({
  categories,
  selectedCategory,
  onSelect,
  onComplete,
  completedCategories,
}: AdditionalServicesGridProps) => {
  const availableCategories = categories.filter(
    (cat) => !completedCategories.includes(cat.id),
  );

  if (availableCategories.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-xl font-semibold mb-4">All Categories Completed</h3>
        <Button onClick={onComplete}>Generate Final Estimate</Button>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-6">
        Would you like any additional work done?
      </h3>
      <RadioGroup
        value={selectedCategory || ""}
        onValueChange={onSelect}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {availableCategories.map((category) => (
          <div
            key={category.id}
            className="relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value={category.id} id={category.id} />
              <Label
                htmlFor={category.id}
                className="flex flex-col cursor-pointer"
              >
                <span className="font-medium">{category.name}</span>
                {category.description && (
                  <span className="text-sm text-muted-foreground">
                    {category.description}
                  </span>
                )}
              </Label>
            </div>
          </div>
        ))}
      </RadioGroup>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={onComplete}>
          Complete Estimate
        </Button>
        {selectedCategory && (
          <Button onClick={() => onSelect(selectedCategory)}>
            Continue with Selected Service
          </Button>
        )}
      </div>
    </Card>
  );
};
