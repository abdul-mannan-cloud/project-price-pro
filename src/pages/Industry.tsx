// src/pages/Industry.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Spinner from "@/components/ui/spinner";
import { Header1 } from "@/components/ui/header";
import { Footerdemo } from "@/components/ui/footer-section";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Category = { id: string; name: string; description: string };

export default function Industry() {
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["industryCategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Options")
        .select("*")
        .single();
      if (error) throw error;
      return Object.keys(data)
        .filter((key) => key !== "Key Options")
        .map((name) => ({
          id: name,
          name,
          description: `Projects related to ${name.toLowerCase()}`,
        }));
    },
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header1 />

      <main className="flex-grow container mx-auto px-4 pt-16 pb-12">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-10">
            {/* Badge + Title + Subtitle */}
            <div className="space-y-2">
              <Badge variant="outline">Service</Badge>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
                Service Categories
              </h2>
              <p className="text-lg text-muted-foreground">
                We provide the following categories for your projects.
              </p>
            </div>

            {/* Grid of categories (no cards, tighter spacing) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-start gap-4">
                  <Check className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="text-lg font-medium">{cat.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {cat.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footerdemo />
    </div>
  );
}
