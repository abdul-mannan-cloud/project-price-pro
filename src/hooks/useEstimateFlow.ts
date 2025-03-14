
import {useEffect, useState} from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Category, CategoryQuestions, AnswersState, EstimateConfig } from "@/types/estimate";
import { findMatchingQuestionSets, consolidateQuestionSets } from "@/utils/questionSetMatcher";
import { Database, Json } from "@/integrations/supabase/types";
import questionManager from "@/components/EstimateForm/QuestionManager.tsx";

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
  const [answers, setAnswers] = useState<AnswersState>({});
  const { toast } = useToast();

  const handlePhotoUpload = (urls: string[]) => {
    setUploadedPhotos(urls);
    if (urls.length > 0) {
      setUploadedImageUrl(urls[0]);
    }
    setStage('description');
  };


  const changeProgress = (newProgress: number) => {
    setProgress(newProgress);
  }


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

  const handleRefreshEstimate = async (leadId:string) => {
    try {
      setIsLoading(true);
      console.log('Refreshing estimate with ID:', leadId);

      if (!leadId) {
        throw new Error('Missing lead ID');
      }


      const address = await supabase.from('contractors').select('business_address').eq('id',config.contractorId).single();
      let address_string=""
      if (!address.data || !address.data.business_address) {
        try {
          const response = await fetch('https://ipapi.co/json/?key=AzZ4jUj0F5eFNjhgWgLpikGJxYdf5IzcsfBQSiOMw69RtR8JzX');

          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }

          const ipAddressData = await response.json();

          address_string=`${ipAddressData.city}, ${ipAddressData.region}, ${ipAddressData.country_name}`

        } catch (error) {
          console.error('Error fetching IP address data:', error);
          throw error;
        }
      } else {
        address_string=address.data.business_address
      }


      toast({
        title: "Estimate refresh started",
        description: "Your estimate will be updated shortly.",
      });

      const { error: generateError } = await supabase.functions.invoke('generate-estimate', {
        body: {
          leadId: leadId,
          contractorId: config.contractorId,
          projectDescription: projectDescription,
          category: matchedQuestionSets[0].category,
          imageUrl: uploadedImageUrl,
          projectImages: uploadedPhotos,
          answers: answers,
          address:address_string
        }
      });

      if(generateError) throw generateError;


      let attempts = 0;
      const pollInterval = setInterval(async () => {
        try {
          const isComplete = await checkEstimateStatus(leadId);
          attempts++;

          if (isComplete || attempts >= 10) {
            clearInterval(pollInterval);
            setIsLoading(false);
          }
        } catch (pollError) {
          console.error('Error polling estimate:', pollError);
          clearInterval(pollInterval);
          setIsLoading(false);
        }
      }, 3000);

    } catch (error) {
      console.error('Error refreshing estimate:', error);
      toast({
        title: "Error",
        description: "Failed to refresh the estimate. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleCategorySelect = (categoryIds: string[]) => {
    setSelectedCategory(categoryIds[0]);

    let questionSets = []

    for(let i=0; i < categoryIds.length; i++){
      const selectedCategoryData = categories.find(cat => cat.id === categoryIds[i]);

      if (selectedCategoryData) {
        // Create a question set for the selected category
        const questionSet = {
          category: categoryIds[i],
          questions: selectedCategoryData.questions || [],
          confidence: 1,
          keywords: selectedCategoryData.keywords || []
        };

        questionSets.push(questionSet);

      }

      setMatchedQuestionSets(questionSets);

    }
    


    setStage('questions');
  };

  const checkEstimateStatus = async (leadId: string) => {
    const { data: lead } = await supabase
      .from('leads')
      .select('estimate_data, status, error_message')
      .eq('id', leadId)
      .maybeSingle();


    if (!lead) return false;

    if (lead.status === 'error') {
      throw new Error(lead.error_message || 'Failed to generate estimate');
    }

    if (lead.status === 'complete' && lead.estimate_data) {
      setEstimate(lead.estimate_data);
      setIsGeneratingEstimate(false);
      setStage('estimate');
      return true;
    }

    return false;
  };

  const startEstimateGeneration = async (leadId: string) => {
    try {
      console.log('Starting background estimate generation for lead:', leadId);
      
      const { error } = await supabase.functions.invoke('generate-estimate', {
        body: {
          leadId,
          contractorId: config.contractorId,
          projectDescription,
          category: selectedCategory,
          imageUrl: uploadedImageUrl,
          projectImages: uploadedPhotos,
          answers: answers
        }
      });

      if (error) throw error;

      // Start polling for estimate completion
      const pollInterval = setInterval(async () => {
        try {
          const isComplete = await checkEstimateStatus(leadId);
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

      // Set a timeout to stop polling after 2 minutes
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
      console.error('Error initiating estimate generation:', error);
      setIsGeneratingEstimate(false);
      toast({
        title: "Error",
        description: "Failed to start estimate generation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleQuestionComplete = async (answers: AnswersState,leadId:string) => {
    if (!config.contractorId) {
      console.error('Missing contractor ID in config:', config);
      toast({
        title: "Error",
        description: "Contractor ID is required",
        variant: "destructive",
      });
      return;
    }
  
    const currentCategory = matchedQuestionSets[0]?.category;
    const firstAnswer = answers[currentCategory]?.Q1?.answers[0];
    
    setAnswers(answers);
    setCurrentLeadId(leadId);
    console.log('Estimate flow lead id:', currentLeadId);
      setStage('contact');

    // Create lead first
    // try {
    //   const formattedAnswers = formatAnswersForJson(answers);
    //
    //   const leadData: LeadInsert = {
    //     project_description: firstAnswer || projectDescription || 'New project',
    //     project_title: `${currentCategory || 'New'} Project`,
    //     answers: formattedAnswers,
    //     category: currentCategory,
    //     status: 'pending',
    //     contractor_id: config.contractorId,
    //     project_images: uploadedPhotos
    //   };
    //
    //   const { data: lead, error: leadError } = await supabase
    //     .from('leads')
    //     .insert(leadData)
    //     .select()
    //     .single();
    //
    //   if (leadError) throw leadError;
    //
    //   if (!lead?.id) {
    //     throw new Error('Failed to create lead - no ID returned');
    //   }
    //
    //   setCurrentLeadId(lead.id);
    //   // Only transition to contact stage after lead is created and ID is set
    //   setStage('contact');
    // } catch (error) {
    //   console.error('Error creating lead:', error);
    //   toast({
    //     title: "Error",
    //     description: "Failed to create lead. Please try again.",
    //     variant: "destructive",
    //   });
    // }
  };

  const formatAnswersForJson = (answers: AnswersState): Json => {
    const formattedAnswers = Object.entries(answers).reduce((acc, [category, categoryAnswers]) => {
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

    return formattedAnswers as Json;
  };

  const handleContactSubmit = async (contactData: any, skip:boolean=false) => {
    try {
      if (!currentLeadId) {
        throw new Error('No lead ID available');
      }

      if(skip) {
        // Update the lead with contact information
        const {error: updateError} = await supabase
            .from('leads')
            .update({
              user_name: contactData.fullName,
              user_email: contactData.email,
              user_phone: contactData.phone,
              project_address: contactData.address
            })
            .eq('id', currentLeadId);

        if (updateError) throw updateError;
      }
      console.log('Contact information saved successfully');

      const isComplete = await checkEstimateStatus(currentLeadId);

      setIsGeneratingEstimate(false)

    } catch (error) {
      console.error('Error saving contact information:', error);
      toast({
        title: "Error",
        description: "Failed to save your contact information. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSkip = async () => {
    if (!config.contractorId) {
      console.error('Missing contractor ID:', config);
      return;
    }

    try {
      setIsGeneratingEstimate(true);

      // Convert answers to Json type
      const formattedAnswers = formatAnswersForJson(answers);

      const leadData: LeadInsert = {
        project_description: projectDescription || 'Test project',
        project_title: `Test Project`,
        answers: formattedAnswers,
        category: selectedCategory,
        status: 'pending',
        contractor_id: config.contractorId,
        project_images: uploadedPhotos,
        is_test_estimate: true
      };

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert(leadData)
        .select()
        .single();

      if (leadError) throw leadError;
      
      if (!lead?.id) {
        throw new Error('Failed to create lead - no ID returned');
      }

      setCurrentLeadId(lead.id);

      const { error: emailError } = await supabase.functions.invoke('send-contractor-notification', {
        body: {
          estimate: {
            totalCost: 0
          },
          contractor: {
            contact_email: config.contractorEmail,
          },
          questions: matchedQuestionSets,
          answers: answers,
          isTestEstimate: true
        }
      });

      if (emailError) {
        console.error('Error sending test estimate notification:', emailError);
      }
      
      // Start estimate generation just like in contact form submission
      startEstimateGeneration(lead.id);

    } catch (error) {
      console.error('Error skipping contact form:', error);
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
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
    handleSkip,
    handleRefreshEstimate,
    changeProgress
  };
};
