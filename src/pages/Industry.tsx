// src/pages/Industry.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Spinner from "@/components/ui/spinner";
import { Header1 } from "@/components/ui/header";
import { Footerdemo } from "@/components/ui/footer-section";

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

      {/* Left-aligned content */}
      <main className="flex-grow container mx-auto px-4 pt-16 pb-12">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-semibold mb-4 text-left">
              Service Categories
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 border rounded-lg bg-white shadow-sm"
                >
                  <h3 className="font-medium mb-1">{cat.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {cat.description}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <Footerdemo />
    </div>
  );
}
