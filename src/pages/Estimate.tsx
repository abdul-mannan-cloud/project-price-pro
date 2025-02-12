import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ContactForm } from "@/components/EstimateForm/ContactForm";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";
import { LoadingScreen } from "@/components/EstimateForm/LoadingScreen";
import { Category, CategoryQuestions, AnswersState } from "@/types/estimate";
import { QuestionManager } from "@/components/EstimateForm/QuestionManager";
import { PhotoUploadStep } from "@/components/EstimateForm/PhotoUploadStep";
import { ProjectDescriptionStep } from "@/components/EstimateForm/ProjectDescriptionStep";
import { CategorySelectionStep } from "@/components/EstimateForm/CategorySelectionStep";
import { ArrowLeft } from "lucide-react";
import { findMatchingQuestionSets, consolidateQuestionSets } from "@/utils/questionSetMatcher";

interface Lead {
  id: string;
  status: string;
  error_message?: string | null;
  estimate_data?: any;
  image_url?: string | null;
}

const EstimatePage = () => {
  const [stage, setStage] = useState<'photo' | 'description' | 'questions' | 'contact' | 'estimate' | 'category'>('photo');
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
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isGeneratingEstimate, setIsGeneratingEstimate] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { contractorId } = useParams();

  const { data: contractor, isError: isContractorError } = useQuery({
    queryKey: ["contractor", contractorId],
    queryFn: async () => {
      if (!contractorId) {
        throw new Error("No contractor ID provided");
      }
      const { data, error } = await supabase
        .from("contractors")
        .select("*, contractor_settings(*)")
        .eq("id", contractorId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Contractor not found");
      return data;
    },
    enabled: !!contractorId,
  });

  useEffect(() => {
    if (isContractorError) {
      toast({
        title: "Error",
        description: "Unable to load contractor information. Please try again later.",
        variant: "destructive",
      });
    }
  }, [isContractorError, toast]);

  useEffect(() => {
    loadCategories();
    checkSpeechSupport();
  }, []);

  const checkSpeechSupport = () => {
    const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setIsSpeechSupported(isSupported);
  };

  const loadCategories = async () => {
    try {
      const { data: optionsData, error: optionsError } = await supabase
        .from('Options')
        .select('*')
        .eq('Key Options', '42e64c9c-53b2-49bd-ad77-995ecb3106c6')
        .single();

      if (optionsError) throw optionsError;

      const transformedCategories: Category[] = Object.keys(optionsData)
        .filter(key => key !== 'Key Options')
        .map(key => {
          const catData = optionsData[key] as Record<string, any>;
          return {
            id: key,
            name: catData.name || key.replace(/_/g, ' '),
            description: catData.description || `Get an estimate for your ${key.toLowerCase()} project`,
            icon: catData.icon,
            keywords: Array.isArray(catData.keywords) ? catData.keywords : [],
            questions: Array.isArray(catData.questions) ? catData.questions : []
          };
        });

      setCategories(transformedCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
    // Load question set and move to questions stage
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

      console.log('Created lead:', lead.id);
      setCurrentLeadId(lead.id);
      setStage('contact');

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

      const { data: estimateData, error: estimateError } = await supabase.functions.invoke('generate-estimate', {
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

      // Poll for the estimate data
      const checkEstimate = async () => {
        const { data: lead, error } = await supabase
          .from('leads')
          .select('estimate_data, status, error_message, image_url')
          .eq('id', currentLeadId)
          .maybeSingle();

        if (error) throw error;

        if (!lead) return false;

        if (lead.status === 'error') {
          throw new Error(lead.error_message || 'Failed to generate estimate');
        }

        if (lead.status === 'complete' && lead.estimate_data) {
          console.log('Estimate generated:', lead.estimate_data);
          setEstimate(lead.estimate_data);
          setIsGeneratingEstimate(false);
          return true;
        }

        return false;
      };

      // Poll every 3 seconds until estimate is ready
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
          setStage('contact');
        }
      }, 3000);

      // Cleanup interval after 2 minutes (timeout)
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isGeneratingEstimate) {
          setIsGeneratingEstimate(false);
          toast({
            title: "Error",
            description: "Estimate generation timed out. Please try again.",
            variant: "destructive",
          });
          setStage('contact');
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
      setStage('contact');
    }
  };

  const getProgressValue = () => {
    switch (stage) {
      case 'photo':
        return 15;
      case 'description':
        return 30;
      case 'category':
        return 45;
      case 'questions':
        return progress;
      case 'contact':
        return 90;
      case 'estimate':
        return 100;
      default:
        return 0;
    }
  };

  const showProgressBar = stage !== 'estimate' && stage !== 'contact';

  if (isLoading && stage === 'questions') {
    return <LoadingScreen message="Loading questions..." />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {showProgressBar && (
        <Progress 
          value={getProgressValue()} 
          className="h-8 rounded-none transition-all duration-500 ease-in-out"
        />
      )}
      
      {contractor && contractor.id === contractorId && (
        <div className="w-full border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-2">
            <button 
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 p-2"
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-12">
        {stage === 'photo' && (
          <PhotoUploadStep
            onPhotoUploaded={handlePhotoUpload}
            onSkip={() => setStage('description')}
            contractor={contractor}
          />
        )}

        {stage === 'description' && (
          <ProjectDescriptionStep
            onSubmit={handleDescriptionSubmit}
            isSpeechSupported={isSpeechSupported}
          />
        )}

        {stage === 'category' && (
          <CategorySelectionStep
            categories={categories}
            selectedCategory={selectedCategory || undefined}
            completedCategories={completedCategories}
            onSelectCategory={handleCategorySelect}
          />
        )}

        {stage === 'questions' && matchedQuestionSets.length > 0 && (
          <QuestionManager
            questionSets={matchedQuestionSets}
            onComplete={handleQuestionComplete}
            onProgressChange={setProgress}
          />
        )}

        {stage === 'contact' && (
          <div className="animate-fadeIn">
            {estimate && (
              <EstimateDisplay 
                groups={estimate.groups} 
                totalCost={estimate.totalCost} 
                isBlurred={true}
                contractor={contractor || undefined}
              />
            )}
            <ContactForm 
              onSubmit={handleContactSubmit} 
              leadId={currentLeadId || undefined}
              estimate={estimate}
              contractor={contractor}
              onSkip={async () => {
                if (currentLeadId) {
                  await handleContactSubmit({});
                }
              }}
            />
          </div>
        )}

        {stage === 'estimate' && isGeneratingEstimate && (
          <LoadingScreen message="Building your custom estimate..." isEstimate={true} />
        )}

        {stage === 'estimate' && !isGeneratingEstimate && estimate && (
          <div className="animate-fadeIn">
            <EstimateDisplay 
              groups={estimate.groups} 
              totalCost={estimate.totalCost}
              contractor={contractor || undefined}
              projectSummary={projectDescription}
              estimate={estimate}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default EstimatePage;
