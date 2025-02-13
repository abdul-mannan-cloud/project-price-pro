
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { useEstimateFlow } from "@/hooks/useEstimateFlow";
import { EstimateProgress } from "@/components/EstimateForm/EstimateProgress";
import { ContactForm } from "@/components/EstimateForm/ContactForm";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";
import { LoadingScreen } from "@/components/EstimateForm/LoadingScreen";
import { QuestionManager } from "@/components/EstimateForm/QuestionManager";
import { PhotoUploadStep } from "@/components/EstimateForm/PhotoUploadStep";
import { ProjectDescriptionStep } from "@/components/EstimateForm/ProjectDescriptionStep";
import { CategorySelectionStep } from "@/components/EstimateForm/CategorySelectionStep";
import { EstimateAnimation } from "@/components/EstimateForm/EstimateAnimation";

const EstimatePage = () => {
  const navigate = useNavigate();
  const { contractorId } = useParams();
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);

  const {
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
  } = useEstimateFlow(contractorId);

  const { data: contractor, isError: isContractorError } = useQuery({
    queryKey: ["contractor", contractorId],
    queryFn: async () => {
      if (!contractorId) throw new Error("No contractor ID provided");
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
    const loadCategories = async () => {
      try {
        const { data: optionsData, error: optionsError } = await supabase
          .from('Options')
          .select('*')
          .eq('Key Options', '42e64c9c-53b2-49bd-ad77-995ecb3106c6')
          .single();

        if (optionsError) throw optionsError;

        const transformedCategories = Object.keys(optionsData)
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
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setIsSpeechSupported(isSupported);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <EstimateProgress stage={stage} progress={progress} />
      
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
            onProgressChange={progress => setStage('questions')}
          />
        )}

        <div className="relative">
          {/* Show estimate animation behind contact form */}
          {(stage === 'contact' || isGeneratingEstimate) && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 flex items-center justify-center">
              <EstimateAnimation className="w-[200px] h-[200px]" height="h-[200px]" width="w-[200px]" />
            </div>
          )}

          {stage === 'contact' && (
            <div className="animate-fadeIn relative z-40">
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

          {stage === 'estimate' && !isGeneratingEstimate && (
            <div className="animate-fadeIn">
              <EstimateDisplay 
                groups={estimate?.groups || []} 
                totalCost={estimate?.totalCost || 0}
                contractor={contractor || undefined}
                projectSummary={projectDescription}
                estimate={estimate}
                isLoading={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EstimatePage;
