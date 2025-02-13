
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Category, CategoryQuestions, AnswersState } from "@/types/estimate";
import { findMatchingQuestionSets, consolidateQuestionSets } from "@/utils/questionSetMatcher";

export type EstimateStage = 'photo' | 'description' | 'questions' | 'contact' | 'estimate' | 'category';

export const useEstimateFlow = (contractorId?: string) => {
  const [stage, setStage] = useState<EstimateStage>('photo');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [projectDescription, setProjectDescription] = useState("");
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [completedCategories, setCompletedCategories] = useState<string[]>([]);
  const [matchedQuestionSets, setMatchedQuestionSets] = useState<CategoryQuestions[]>([]);
  const [progress, setProgress] = useState(0);
  const [estimate, setEstimate] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingEstimate, setIsGeneratingEstimate] = useState(false);
  const { toast } = useToast();

  const handlePhotoUpload = (url: string) => {
    setUploadedImageUrl(url);
    setStage('description');
  };

  const handleDescriptionSubmit = async (description: string) => {
    setProjectDescription(description);
    const categoriesForMatching = categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      keywords: category.keywords || [],
      questions: category.questions || []
    }));

    const matches = await findMatchingQuestionSets(description, categoriesForMatching);
    const consolidatedSets = consolidateQuestionSets(matches, description);

    if (consolidatedSets.length === 0) {
      setStage('category');
      return;
    }

    if (consolidatedSets[0]?.category) {
      setSelectedCategory(consolidatedSets[0].category);
    }

    setMatchedQuestionSets(consolidatedSets);
    setStage('questions');
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setStage('questions');
  };

  const handleQuestionComplete = async (answers: AnswersState) => {
    try {
      const answersForSupabase = Object.entries(answers).reduce((acc, [category, categoryAnswers]) => {
        acc[category] = Object.entries(categoryAnswers).reduce((catAcc, [questionId, answer]) => {
          catAcc[questionId] = {
            question: answer.question,
            type: answer.type,
            answers: answer.answers,
            options: answer.options
          };
          return catAcc;
        }, {} as Record<string, any>);
        return acc;
      }, {} as Record<string, any>);

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          category: selectedCategory,
          answers: answersForSupabase,
          project_title: `${selectedCategory || ''} Project`,
          project_description: projectDescription,
          contractor_id: contractorId,
          status: 'pending',
          image_url: uploadedImageUrl
        })
        .select()
        .single();

      if (leadError) throw leadError;

      setCurrentLeadId(lead.id);
      setStage('contact');
      // Start generating estimate as soon as we move to contact form
      setIsGeneratingEstimate(true);

      // Start the estimate generation process
      const { error: estimateError } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          leadId: lead.id,
          contractorId,
          projectDescription,
          category: selectedCategory,
          imageUrl: uploadedImageUrl
        }
      });

      if (estimateError) throw estimateError;

    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: "Error",
        description: "Failed to save your responses. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContactSubmit = async (contactData: any) => {
    try {
      if (!currentLeadId) {
        throw new Error('No lead ID found');
      }

      setIsGeneratingEstimate(true);
      setStage('estimate');

      // Update lead with contact information
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          user_name: contactData.fullName,
          user_email: contactData.email,
          user_phone: contactData.phone,
          project_address: contactData.address
        })
        .eq('id', currentLeadId);

      if (updateError) throw updateError;

      const { error: estimateError } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          leadId: currentLeadId,
          contractorId,
          projectDescription,
          category: selectedCategory,
          imageUrl: uploadedImageUrl
        }
      });

      if (estimateError) {
        throw estimateError;
      }

      const checkEstimate = async () => {
        const { data: lead, error } = await supabase
          .from('leads')
          .select('estimate_data, status, error_message')
          .eq('id', currentLeadId)
          .maybeSingle();

        if (error) throw error;
        if (!lead) return false;

        if (lead.status === 'error') {
          throw new Error(lead.error_message || 'Failed to generate estimate');
        }

        if (lead.status === 'complete' && lead.estimate_data) {
          setEstimate(lead.estimate_data);
          setIsGeneratingEstimate(false);
          return true;
        }

        return false;
      };

      const pollInterval = setInterval(async () => {
        try {
          const isComplete = await checkEstimate();
          if (isComplete) {
            clearInterval(pollInterval);
          }
        } catch (error) {
          clearInterval(pollInterval);
          setIsGeneratingEstimate(false);
          console.error('Error polling estimate:', error);
          toast({
            title: "Error",
            description: "Failed to generate estimate. Please try again.",
            variant: "destructive",
          });
        }
      }, 3000);

      setTimeout(() => {
        clearInterval(pollInterval);
        if (isGeneratingEstimate) {
          setIsGeneratingEstimate(false);
          toast({
            title: "Error",
            description: "Estimate generation timed out. Please try again.",
            variant: "destructive",
          });
        }
      }, 120000);

    } catch (error) {
      console.error('Error generating estimate:', error);
      setIsGeneratingEstimate(false);
      toast({
        title: "Error",
        description: "Failed to generate estimate. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    stage,
    setStage,
    uploadedImageUrl,
    projectDescription,
    currentLeadId,
    selectedCategory,
    completedCategories,
    matchedQuestionSets,
    progress,
    estimate,
    categories,
    setCategories,
    isLoading,
    setIsLoading,
    isGeneratingEstimate,
    handlePhotoUpload,
    handleDescriptionSubmit,
    handleCategorySelect,
    handleQuestionComplete,
    handleContactSubmit
  };
};
