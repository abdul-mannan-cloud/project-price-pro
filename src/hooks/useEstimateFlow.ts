
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Category, CategoryQuestions, AnswersState, EstimateConfig } from "@/types/estimate";
import { findMatchingQuestionSets, consolidateQuestionSets } from "@/utils/questionSetMatcher";
import { Database, Json } from "@/integrations/supabase/types";

type LeadInsert = Database['public']['Tables']['leads']['Insert'];

export type EstimateStage = 'photo' | 'description' | 'questions' | 'contact' | 'estimate' | 'category';

export const useEstimateFlow = (config: EstimateConfig) => {
  const [stage, setStage] = useState<EstimateStage>('photo');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
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

  const handlePhotoUpload = (urls: string[]) => {
    setUploadedPhotos(urls);
    if (urls.length > 0) {
      setUploadedImageUrl(urls[0]);
    }
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
      if (!config.contractorId) {
        throw new Error('Contractor ID is required');
      }

      const answersForDb = Object.entries(answers).reduce((acc, [category, categoryAnswers]) => {
        acc[category] = Object.entries(categoryAnswers || {}).reduce((catAcc, [questionId, answer]) => {
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

      // Create the lead with contractor_id
      const currentCategory = matchedQuestionSets[0]?.category;
      const firstAnswer = answers[currentCategory]?.Q1?.answers[0];

      const leadData: LeadInsert = {
        project_description: firstAnswer || 'New project',
        project_title: `${currentCategory || 'New'} Project`,
        answers: answersForDb as Json,
        category: currentCategory,
        status: 'pending',
        contractor_id: config.contractorId, // Ensure we set the contractor_id here
        project_images: uploadedPhotos
      };

      console.log('Creating lead with data:', leadData);

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert(leadData)
        .select()
        .single();

      if (leadError) throw leadError;
      
      if (!lead?.id) {
        throw new Error('Failed to create lead - no ID returned');
      }

      console.log('Lead created successfully:', lead.id);
      setCurrentLeadId(lead.id);
      setStage('contact');
      setIsGeneratingEstimate(true);

      // Generate estimate with contractor ID
      const { error: generateError } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          answers: answersForDb,
          projectDescription,
          category: currentCategory,
          leadId: lead.id,
          contractorId: config.contractorId, // Make sure we pass the contractor ID here
          imageUrl: uploadedImageUrl,
          projectImages: uploadedPhotos
        }
      });

      if (generateError) throw generateError;

    } catch (error) {
      console.error('Error completing questions:', error);
      toast({
        title: "Error",
        description: "Failed to process your answers. Please try again.",
        variant: "destructive",
      });
      setIsGeneratingEstimate(false);
    }
  };

  const handleContactSubmit = async (contactData: any) => {
    try {
      if (!currentLeadId || !config.contractorId) {
        throw new Error('Missing required data');
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
          project_address: contactData.address,
          contractor_id: config.contractorId
        })
        .eq('id', currentLeadId);

      if (updateError) throw updateError;

      // Generate estimate with contractor ID
      const { error: estimateError } = await supabase.functions.invoke('generate-estimate', {
        body: {
          leadId: currentLeadId,
          contractorId: config.contractorId,
          projectDescription,
          category: selectedCategory,
          imageUrl: uploadedImageUrl,
          projectImages: uploadedPhotos
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

  const handleSkip = async () => {
    if (!currentLeadId || !config.contractorId) return;

    setIsGeneratingEstimate(true);
    try {
      const { data: estimateData, error } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          answers: {},
          projectDescription: "New project inquiry",
          leadId: currentLeadId,
          contractorId: config.contractorId,
          category: "General"
        }
      });

      if (error) throw error;
      setEstimate(estimateData);
    } catch (error) {
      console.error('Error generating estimate:', error);
      toast({
        title: "Error",
        description: "Failed to generate estimate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingEstimate(false);
    }
  };

  return {
    stage,
    setStage,
    uploadedImageUrl,
    uploadedPhotos,
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
    handleContactSubmit,
    handleSkip
  };
};
