import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, SkipForward, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { QuestionCard } from "@/components/EstimateForm/QuestionCard";
import { LoadingScreen } from "@/components/EstimateForm/LoadingScreen";
import { ContactForm } from "@/components/EstimateForm/ContactForm";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";
import { CategoryGrid } from "@/components/EstimateForm/CategoryGrid";
import { Question, Category, CategoryQuestions, AnswersState } from "@/types/estimate";
import { findMatchingQuestionSets, consolidateQuestionSets } from "@/utils/questionSetMatcher";
import { QuestionManager } from "@/components/EstimateForm/QuestionManager";

const EstimatePage = () => {
  const [stage, setStage] = useState<'photo' | 'description' | 'questions' | 'contact' | 'estimate' | 'category'>('photo');
  const [projectDescription, setProjectDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [estimate, setEstimate] = useState<any>(null);
  const [totalStages, setTotalStages] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [completedCategories, setCompletedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryQuestions | null>(null);
  const [matchedQuestionSets, setMatchedQuestionSets] = useState<CategoryQuestions[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { contractorId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);

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
      if (error) {
        console.error("Error fetching contractor:", error);
        throw error;
      }
      if (!data) {
        throw new Error("Contractor not found");
      }
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
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadQuestionSet(selectedCategory);
    }
  }, [selectedCategory]);

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

  const loadQuestionSet = async (categoryId: string) => {
    try {
      const { data: optionsData, error: optionsError } = await supabase
        .from('Options')
        .select('*')
        .eq('Key Options', '42e64c9c-53b2-49bd-ad77-995ecb3106c6')
        .single();

      if (optionsError) throw optionsError;

      const rawCategoryData = optionsData[categoryId] as Record<string, any>;
      if (!rawCategoryData) throw new Error('Category data not found');

      const questionSet: CategoryQuestions = {
        category: categoryId,
        keywords: Array.isArray(rawCategoryData.keywords) ? rawCategoryData.keywords : [],
        questions: Array.isArray(rawCategoryData.questions) ? rawCategoryData.questions.map((q: any) => ({
          id: q.id || `q-${q.order}`,
          question: q.question,
          type: q.type || 'single_choice',
          order: q.order || 0,
          options: Array.isArray(q.options) ? q.options : [],
          next: q.next
        })) : []
      };

      setCategoryData(questionSet);
    } catch (error) {
      console.error('Error loading question set:', error);
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project_images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project_images')
        .getPublicUrl(fileName);

      setUploadedImageUrl(publicUrl);
      setStage('description');
      toast({ title: "Success", description: "Image uploaded successfully" });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatQuestions = (rawQuestions: any[]): Question[] => {
    if (!Array.isArray(rawQuestions)) {
      console.error('Invalid questions format:', rawQuestions);
      return [];
    }
    return rawQuestions.map((q: any) => {
      const selectionData = q.selections || q.options || [];
      return {
        id: q.id || `q-${q.order}`,
        order: q.order || 0,
        question: q.question,
        type: q.type || (q.multi_choice
                  ? 'multiple_choice'
                  : (selectionData.length === 2 && selectionData[0] === 'Yes' && selectionData[1] === 'No'
                      ? 'yes_no'
                      : 'single_choice')),
        options: Array.isArray(selectionData)
          ? selectionData.map((opt: any, optIndex: number) => ({
              label: typeof opt === 'string' ? opt : opt.label,
              value: typeof opt === 'string' ? opt.toLowerCase() : opt.value,
              image_url: (q.image_urls && q.image_urls[optIndex]) || ""
            }))
          : [],
        next: q.next_question
      };
    });
  };

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  const loadCategoryQuestions = async (retryCount = 0) => {
    if (!selectedCategory) {
      console.error('No category selected');
      return;
    }
    
    setIsProcessing(true);
    try {
      console.log(`Attempting to load questions for category: ${selectedCategory} (attempt ${retryCount + 1})`);
      const { data, error } = await supabase
        .from('Options')
        .select('*')
        .eq('Key Options', '42e64c9c-53b2-49bd-ad77-995ecb3106c6')
        .single();

      if (error) {
        console.error('Error fetching options:', error);
        throw error;
      }

      if (!data || !data[selectedCategory]) {
        console.error('No data found for category:', selectedCategory);
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying in ${RETRY_DELAY}ms... (${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => loadCategoryQuestions(retryCount + 1), RETRY_DELAY);
          return;
        }
        throw new Error(`No questions found for category: ${selectedCategory}`);
      }

      const categoryData = data[selectedCategory];
      console.log('Raw category data:', categoryData);

      if (!categoryData || typeof categoryData !== 'object' || !Array.isArray(categoryData.questions)) {
        console.error('Invalid questions format:', categoryData);
        if (retryCount < MAX_RETRIES) {
          console.log(`Invalid data format, retrying in ${RETRY_DELAY}ms... (${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => loadCategoryQuestions(retryCount + 1), RETRY_DELAY);
          return;
        }
        throw new Error('Invalid questions format');
      }

      const formattedQuestions = formatQuestions(categoryData.questions);
      console.log('Final formatted questions:', formattedQuestions);
      
      if (formattedQuestions.length === 0) {
        toast({
          title: "No questions available",
          description: "Unable to load questions for this category.",
          variant: "destructive",
        });
        setStage('category');
        return;
      }

      setQuestions(formattedQuestions);
      setTotalStages(formattedQuestions.length);
      setStage('questions');
    } catch (error) {
      console.error('Error loading questions:', error);
      if (retryCount >= MAX_RETRIES) {
        toast({
          title: "Error",
          description: "Failed to load questions. Please try again.",
          variant: "destructive",
        });
        setStage('category');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDescriptionSubmit = async () => {
    setIsProcessing(true);
    try {
      const categoriesForMatching: Category[] = categories.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description,
        icon: category.icon,
        keywords: category.keywords || [],
        questions: category.questions || []
      }));

      const matches = await findMatchingQuestionSets(projectDescription, categoriesForMatching);
      
      const consolidatedSets = consolidateQuestionSets(matches, projectDescription);

      if (consolidatedSets.length === 0) {
        setStage('category');
        return;
      }

      setMatchedQuestionSets(consolidatedSets);
      setStage('questions');
    } catch (error) {
      console.error('Error matching question sets:', error);
      toast({
        title: "Error",
        description: "Failed to process your description. Please try again.",
        variant: "destructive",
      });
      setStage('category');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnswerSubmit = async (questionId: string, value: string | string[]) => {
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers(prev => ({ 
      ...prev, 
      [currentQuestionIndex]: Array.isArray(value) ? value : [value]
    }));

    if (currentQuestion.type !== 'multiple_choice') {
      if (currentQuestionIndex < questions.length - 1) {
        setTimeout(() => setCurrentQuestionIndex(prev => prev + 1), 300);
      } else {
        setIsProcessing(true);
        await generateEstimate();
      }
    }
  };

  const handleCategoryComplete = (categoryId: string) => {
    setCompletedCategories(prev => [...prev, categoryId]);
    setStage('category');
  };

  const generateEstimate = async () => {
    try {
      const formattedAnswers = Object.entries(answers).map(([index, value]) => {
        const question = questions[parseInt(index)];
        return {
          question: question.question,
          answer: Array.isArray(value) 
            ? value.map(v => question.options.find(opt => opt.value === v)?.label || v)
            : question.options.find(opt => opt.value === value)?.label || value
        };
      });

      const { data, error } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          projectDescription, 
          imageUrl: uploadedImageUrl, 
          answers: formattedAnswers,
          contractorId,
          leadId: currentLeadId,
          category: selectedCategory
        }
      });

      if (error) throw error;
      setEstimate(data);
      setStage('contact');
    } catch (error) {
      console.error('Error generating estimate:', error);
      toast({
        title: "Error",
        description: "Failed to generate estimate. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContactSubmit = async (contactData: any) => {
    try {
      if (!contractorId || !currentLeadId) {
        throw new Error("Missing contractor ID or lead ID");
      }
      setStage('estimate');
    } catch (error) {
      console.error('Error saving lead:', error);
      toast({
        title: "Error",
        description: "Failed to save your information. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleQuestionComplete = async (answers: AnswersState) => {
    setIsProcessing(true);
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
          status: 'pending'
        })
        .select()
        .single();

      if (leadError) throw leadError;

      setCurrentLeadId(lead.id);

      const { data: estimateData, error } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          projectDescription, 
          imageUrl: uploadedImageUrl, 
          answers: answersForSupabase,
          contractorId,
          leadId: lead.id,
          category: selectedCategory
        }
      });

      if (error) throw error;
      
      const { error: updateError } = await supabase
        .from('leads')
        .update({ 
          estimate_data: estimateData,
          estimated_cost: estimateData.totalCost || 0
        })
        .eq('id', lead.id);

      if (updateError) throw updateError;

      setEstimate(estimateData);
      setStage('contact');
    } catch (error) {
      console.error('Error generating estimate:', error);
      toast({
        title: "Error",
        description: "Failed to generate estimate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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
        const baseProgress = 45;
        const maxProgress = 85;
        const progressRange = maxProgress - baseProgress;
        
        if (matchedQuestionSets.length === 0) return baseProgress;
        
        const totalQuestions = matchedQuestionSets.reduce((acc, set) => 
          acc + (Array.isArray(set.questions) ? set.questions.length : 0), 0);
        
        const completedQuestions = Object.keys(answers).length;
        
        const progressPercentage = totalQuestions > 0 
          ? (completedQuestions / totalQuestions) 
          : 0;
        
        return baseProgress + (progressRange * progressPercentage);
      case 'contact':
        return 90;
      case 'estimate':
        return 100;
      default:
        return 0;
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    loadQuestionSet(categoryId);
  };

  if (isProcessing) {
    return (
      <LoadingScreen
        message={
          stage === 'questions' && currentQuestionIndex === questions.length - 1
            ? "Generating your estimate..."
            : "Processing your request..."
        }
      />
    );
  }

  if (isLoading && stage === 'questions') {
    return <LoadingScreen message="Loading questions..." />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Progress 
        value={getProgressValue()} 
        className="h-8 rounded-none transition-all duration-500 ease-in-out"
      />
      
      {contractor && (
        <button 
          onClick={() => navigate("/dashboard")}
          className="absolute top-4 left-4 text-muted-foreground hover:text-foreground flex items-center gap-2 p-2"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
      )}

      <div className="max-w-4xl mx-auto px-4 py-12">
        {stage === 'photo' && (
          <div className="card p-8 animate-fadeIn">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2">
                  🛠 {contractor?.business_name || "Project"} Estimator
                </h2>
                <p className="text-muted-foreground">
                  Take or upload a photo of what you want to repair or modify
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  capture="environment"
                  disabled={isUploading}
                />
                <Button 
                  className="w-full" 
                  size="lg" 
                  disabled={isUploading}
                  asChild
                >
                  <div>
                    <Camera className="mr-2" />
                    {isUploading ? "UPLOADING..." : "TAKE A PHOTO"}
                  </div>
                </Button>
              </label>
              <Button 
                variant="ghost" 
                className="w-full" 
                size="lg" 
                onClick={() => setStage('description')}
              >
                <SkipForward className="mr-2" />
                Skip Photo
              </Button>
            </div>
          </div>
        )}

        {stage === 'description' && !selectedCategory && (
          <div className="card p-8 animate-fadeIn">
            <h2 className="text-2xl font-semibold mb-6">Describe Your Project</h2>
            <div className="space-y-2">
              <Textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Describe what you need help with (minimum 30 characters)..."
                className="min-h-[150px]"
              />
              {projectDescription.length > 0 && projectDescription.length < 30 && (
                <p className="text-sm text-destructive">
                  Please enter at least {30 - projectDescription.length} more characters
                </p>
              )}
            </div>
            <Button 
              className="w-full mt-6"
              onClick={handleDescriptionSubmit}
              disabled={projectDescription.trim().length < 30}
            >
              Continue
            </Button>
          </div>
        )}

        {stage === 'category' && (
          <div className="animate-fadeIn">
            <h2 className="text-2xl font-semibold mb-6">Select Service Category</h2>
            <CategoryGrid 
              categories={categories}
              selectedCategory={selectedCategory || undefined}
              onSelectCategory={handleCategorySelect}
              completedCategories={completedCategories}
            />
          </div>
        )}

        {stage === 'contact' && estimate && (
          <div className="animate-fadeIn">
            <EstimateDisplay 
              groups={estimate.groups} 
              totalCost={estimate.totalCost} 
              isBlurred={true}
              contractor={contractor || undefined}
            />
            <ContactForm 
              onSubmit={handleContactSubmit} 
              leadId={currentLeadId || undefined}
              contractorId={contractorId}
            />
          </div>
        )}

        {stage === 'estimate' && estimate && (
          <div className="animate-fadeIn">
            <EstimateDisplay 
              groups={estimate.groups} 
              totalCost={estimate.totalCost}
              contractor={contractor || undefined}
            />
          </div>
        )}

        {stage === 'questions' && (
          matchedQuestionSets.length > 0 ? (
            <QuestionManager
              questionSets={matchedQuestionSets}
              onComplete={handleQuestionComplete}
            />
          ) : (
            <LoadingScreen message="Loading your questions..." />
          )
        )}
      </div>
    </div>
  );
};

export default EstimatePage;
