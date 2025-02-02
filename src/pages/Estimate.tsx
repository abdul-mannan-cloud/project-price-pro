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
import { Question, Category, CategoryQuestions } from "@/types/estimate";
import { QuestionManager } from "@/components/EstimateForm/QuestionManager";

// Define types for our state
type Stage = 'photo' | 'description' | 'category' | 'questions' | 'contact' | 'estimate';
type CategoryAnswers = Record<string, Record<string, string[]>>;

interface CategoryData {
  keywords: string[];
  questions: Question[];
}

const calculateKitchenEstimate = (answers: Record<string, string[]>) => {
  let estimate = 0;
  
  // Cabinet costs
  if (answers['cabinets']?.includes('yes')) {
    if (answers['cabinet_type']?.includes('refinish')) {
      estimate += 2500; // Base cost for refinishing
      if (answers['cabinet_size']?.includes('large')) {
        estimate += 1500;
      }
    } else if (answers['cabinet_type']?.includes('new')) {
      estimate += 5000; // Base cost for new cabinets
      if (answers['cabinet_size']?.includes('large')) {
        estimate += 3000;
      }
    }
  }

  // Appliance costs
  if (answers['appliances']?.includes('yes')) {
    const applianceCosts: Record<string, number> = {
      'refrigerator': 2000,
      'dishwasher': 800,
      'stove': 1200,
      'microwave': 400
    };

    answers['appliance_types']?.forEach(appliance => {
      estimate += applianceCosts[appliance] || 0;
    });
  }

  return estimate;
};

const EstimatePage = () => {
  const [stage, setStage] = useState<Stage>('photo');
  const [projectDescription, setProjectDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<CategoryAnswers>({});
  const [estimate, setEstimate] = useState<any>(null);
  const [totalStages, setTotalStages] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [completedCategories, setCompletedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryQuestions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { contractorId } = useParams();

  // Fetch contractor data using react-query.
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

  const { data: optionsData, isLoading: isLoadingOptions } = useQuery({
    queryKey: ["options", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return null;
      const { data, error } = await supabase
        .from('Options')
        .select('*')
        .eq('Key Options', '42e64c9c-53b2-49bd-ad77-995ecb3106c6')
        .single();
      if (error) throw error;
      const categoryData = data[selectedCategory] as CategoryData;
      if (!categoryData) {
        throw new Error(`No questions found for category: ${selectedCategory}`);
      }
      return categoryData;
    },
    enabled: !!selectedCategory
  });

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
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
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

  const loadQuestionSet = async (categoryName: string) => {
    try {
      console.log('Loading questions for category:', categoryName);
      
      const { data: optionsData, error: optionsError } = await supabase
        .from('Options')
        .select('*')
        .eq('Key Options', '42e64c9c-53b2-49bd-ad77-995ecb3106c6')
        .single();

      if (optionsError) {
        console.error('Error fetching options:', optionsError);
        throw optionsError;
      }

      if (!optionsData || !optionsData[categoryName]) {
        console.error('No data found for category:', categoryName);
        toast({
          title: "No questions available",
          description: `No questions found for ${categoryName}`,
          variant: "destructive",
        });
        return;
      }

      const rawData = optionsData[categoryName] as Record<string, any>;
      const parsedData: CategoryQuestions = {
        category: categoryName,
        keywords: Array.isArray(rawData.keywords) ? rawData.keywords : [],
        questions: Array.isArray(rawData.questions) 
          ? rawData.questions.map((q: any, index: number) => ({
              id: q.id || `q-${index}`,
              order: q.order || index,
              question: q.question,
              type: q.type || 'single_choice',
              options: Array.isArray(q.options) 
                ? q.options.map((opt: any) => ({
                    label: opt.label,
                    value: opt.value,
                    image_url: opt.image_url || "",
                    next: opt.next
                  }))
                : [],
              branch_id: q.branch_id || 'default-branch',
              keywords: Array.isArray(q.keywords) ? rawData.keywords : [],
              is_branch_start: q.is_branch_start || false,
              skip_branch_on_no: q.skip_branch_on_no || false,
              priority: q.priority || index,
              next: q.next
            }))
          : []
      };

      console.log('Parsed question set:', parsedData);
      
      if (!Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
        toast({
          title: "No questions available",
          description: `No valid questions found for ${categoryName}`,
          variant: "destructive",
        });
        return;
      }

      setCategoryData(parsedData);
    } catch (error) {
      console.error('Error loading question set:', error);
      toast({
        title: "Error",
        description: "Failed to load questions. Please try again.",
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

  const handleDescriptionSubmit = async () => {
    setIsProcessing(true);
    try {
      console.log('Submitting description:', projectDescription);

      const { data: optionsData, error } = await supabase
        .from('Options')
        .select('*')
        .eq('Key Options', '42e64c9c-53b2-49bd-ad77-995ecb3106c6')
        .single();

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      console.log('Raw Options data:', optionsData);

      // Find best matching category from the Options table columns
      let bestMatch: { category: string; score: number; matchedKeywords: string[] } | null = null;
      const description = projectDescription.toLowerCase();
      
      // Loop through all columns except 'Key Options'
      Object.entries(optionsData).forEach(([columnName, columnData]) => {
        if (columnName === 'Key Options') return;
        
        const data = columnData as CategoryData;
        if (!data?.keywords || !Array.isArray(data.keywords)) {
          console.log(`Skipping category ${columnName}: no keywords found`);
          return;
        }

        let score = 0;
        const matchedKeywords: string[] = [];

        data.keywords.forEach((keyword: string) => {
          const keywordLower = keyword.toLowerCase();
          if (description.includes(keywordLower)) {
            const position = description.indexOf(keywordLower);
            const positionScore = 1 - (position / description.length);
            const lengthScore = keyword.length / description.length;
            const keywordScore = 1 + positionScore + lengthScore;
            
            score += keywordScore;
            matchedKeywords.push(keyword);
            
            console.log(`Matched "${keyword}" with score ${keywordScore}`);
          }
        });

        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          console.log(`New best match: ${columnName} with score ${score}`);
          bestMatch = { category: columnName, score, matchedKeywords };
        }
      });

      if (bestMatch) {
        console.log('Best matching category:', bestMatch);
        
        const categoryData = optionsData[bestMatch.category] as CategoryData;
        
        if (categoryData?.questions) {
          const matchingCategory = categories.find(
            cat => cat.name === bestMatch!.category
          );
          
          if (matchingCategory) {
            setSelectedCategory(matchingCategory.id);
            setQuestions(categoryData.questions);
            setTotalStages(categoryData.questions.length);
            setStage('questions');
            
            toast({
              title: "Category Matched",
              description: `Matched "${bestMatch.category}" based on: ${bestMatch.matchedKeywords.join(', ')}`,
            });
          } else {
            throw new Error('Category not found in available categories');
          }
        } else {
          throw new Error('No questions found for category');
        }
      } else {
        setStage('category');
        toast({
          title: "No Match Found",
          description: "Please select a category manually",
          variant: "default"
        });
      }

    } catch (error) {
      console.error('Error processing description:', error);
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
    const answerValue = Array.isArray(value) ? value : [value];
    
    if (selectedCategory) {
      setAnswers(prev => ({
        ...prev,
        [selectedCategory]: {
          ...prev[selectedCategory],
          [questionId]: answerValue
        }
      }));
    }

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
      const formattedAnswers = Object.entries(answers).reduce((acc, [index, value]) => {
        const question = questions[parseInt(index)];
        if (question) {
          acc[question.id] = value;
        }
        return acc;
      }, {} as Record<string, string[]>);

      const { data, error } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          projectDescription, 
          imageUrl: uploadedImageUrl, 
          answers: formattedAnswers,
          contractorId,
          baseEstimate: selectedCategory === 'Kitchen Remodel' ? calculateKitchenEstimate(formattedAnswers) : 0
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
    } finally {
      setIsProcessing(false);
    }
  };

  const getProgressValue = () => {
    if (stage === 'photo') return 20;
    if (stage === 'description') return 40;
    if (stage === 'questions') {
      return 40 + ((currentQuestionIndex + 1) / questions.length) * 30;
    }
    if (stage === 'contact') return 90;
    if (stage === 'estimate') return 100;
    return 0;
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleQuestionComplete = (answers: Record<string, Record<string, string[]>>) => {
    if (selectedCategory) {
      setCompletedCategories(prev => [...prev, selectedCategory]);
      setAnswers(prev => ({
        ...prev,
        [selectedCategory]: answers[selectedCategory] || []
      }));

      const remainingCategories = categories.filter(
        cat => !completedCategories.includes(cat.id)
      );

      if (remainingCategories.length > 0) {
        setStage('category');
        setSelectedCategory(null);
      } else {
        generateEstimate();
      }
    }
  };

  const handleAdditionalCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setStage('questions');
  };

  const handleContactSubmit = async (data: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
  }) => {
    try {
      // Save lead to database
      const { error: leadError } = await supabase.from('leads').insert({
        contractor_id: contractorId,
        category: selectedCategory,
        answers: answers,
        estimate_data: estimate,
        project_title: `${selectedCategory} Project`,
        project_description: projectDescription,
        project_address: data.address,
        user_name: data.fullName,
        user_email: data.email,
        user_phone: data.phone,
        estimated_cost: estimate.totalCost
      });

      if (leadError) throw leadError;

      setStage('estimate');
      toast({
        title: "Success",
        description: "Your estimate has been generated!",
      });
    } catch (error) {
      console.error('Error saving lead:', error);
      toast({
        title: "Error",
        description: "Failed to save your information. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isProcessing) {
    return <LoadingScreen message="Processing your request..." />;
  }

  if (isLoadingOptions && stage === 'questions') {
    return <LoadingScreen message="Loading questions..." />;
  }

  const getCurrentAnswers = (questionIndex: number): string[] => {
    return answers[selectedCategory]?.[questions[questionIndex].id] || [];
  };

  return (
    <div className="min-h-screen bg-white">
      <Progress value={getProgressValue()} className="h-8 rounded-none" />
      
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

        {stage === 'description' && (
          <div className="card p-8 animate-fadeIn">
            <h2 className="text-2xl font-semibold mb-6">Describe Your Project</h2>
            <div className="space-y-2">
              <Textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Describe what you need help with..."
                className="min-h-[150px]"
              />
            </div>
            <Button 
              className="w-full mt-6"
              onClick={handleDescriptionSubmit}
              disabled={projectDescription.length < 10}
            >
              Continue
            </Button>
          </div>
        )}

        {stage === 'questions' && questions.length > 0 && currentQuestionIndex < questions.length && (
          <QuestionCard
            question={questions[currentQuestionIndex]}
            selectedOptions={getCurrentAnswers(currentQuestionIndex)}
            onSelect={(questionId, values) => handleAnswerSubmit(questionId, values)}
            currentStage={currentQuestionIndex + 1}
            totalStages={totalStages}
          />
        )}

        {stage === 'category' && (
          <div className="animate-fadeIn">
            <h2 className="text-2xl font-semibold mb-6">Select Service Category</h2>
            <CategoryGrid 
              categories={categories}
              onSelectCategory={handleCategorySelect}
              completedCategories={completedCategories}
              selectedCategory={selectedCategory || undefined}
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
            <div className="mt-8">
              <ContactForm onSubmit={handleContactSubmit} />
            </div>
          </div>
        )}

        {stage === 'estimate' && estimate && (
          <EstimateDisplay 
            groups={estimate.groups} 
            totalCost={estimate.totalCost}
            contractor={contractor || undefined}
          />
        )}

        {stage === 'questions' && selectedCategory && (
          <QuestionManager
            projectDescription={projectDescription}
            onComplete={handleQuestionComplete}
            categories={categories}
            currentCategory={selectedCategory}
            onSelectAdditionalCategory={handleAdditionalCategorySelect}
            completedCategories={completedCategories}
          />
        )}
      </div>
    </div>
  );
};

export default EstimatePage;
