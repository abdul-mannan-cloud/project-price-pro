import { useState, useEffect, useCallback } from "react";
import { Question, CategoryQuestions, AnswersState, QuestionAnswer } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database, Json } from "@/integrations/supabase/types";
import { calculateQuestionProgress } from "@/utils/questionNavigation";
import { useSmoothProgress } from "@/hooks/useSmoothProgress";

type LeadInsert = Database['public']['Tables']['leads']['Insert'];

export const useQuestionManager = (
    questionSets: CategoryQuestions[],
    onComplete: (answers: AnswersState, leadId: string) => void,
    onProgressChange: (progress: number) => void,
    contractorId: string,
    projectDescription: string,
    uploadedPhotos: string[],
    uploadedImageUrl: string | null,
    currentStageName: string
) => {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [questionSequence, setQuestionSequence] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [queuedNextQuestions, setQueuedNextQuestions] = useState<string[]>([]);
  const [isGeneratingEstimate, setIsGeneratingEstimate] = useState(false);
  const [pendingBranchTransition, setPendingBranchTransition] = useState(false);
  const [questionWeight, setQuestionWeight] = useState<Record<string, number>>({});

  // Use the smooth progress hook for better progress animation
  const { progress: smoothProgress } = useSmoothProgress(
      questionSequence,
      currentQuestionId,
      answers[questionSets[currentSetIndex]?.category] || {},
      questionSets.length,
      currentSetIndex
  );

  // Calculate expected total questions for current branch
  const analyzeQuestionWeights = useCallback(() => {
    if (!questionSequence.length) return;

    // Analyze the question graph to determine relative weights
    const weights: Record<string, number> = {};
    const branches = new Map<string, string[]>();

    // First pass: identify branches
    questionSequence.forEach(question => {
      // Make sure question and options exist before accessing them
      if (!question || !question.options) {
        console.warn(`Question missing or has no options: ${question?.id || 'unknown'}`);
        return;
      }

      if (question.type === 'multiple_choice') {
        // Multiple choice can lead to multiple branches
        const branchOptions = question.options
            .filter(opt => opt && opt.next && opt.next !== 'END' && opt.next !== 'NEXT_BRANCH')
            .map(opt => opt.next as string);

        if (branchOptions.length) {
          branches.set(question.id, branchOptions);
        }
      } else if (question.options && Array.isArray(question.options)) {
        // Handle other question types with options (including measurement_input)
        const branchOptions = question.options
            .filter(opt => opt && opt.next && opt.next !== 'END' && opt.next !== 'NEXT_BRANCH')
            .map(opt => opt.next as string);

        if (branchOptions.length) {
          branches.set(question.id, branchOptions);
        }
      } else if (question.next) {
        // Handle direct next for measurement_input without options
        branches.set(question.id, [question.next]);
      }
    });

    // Assign weights based on branch structure
    const calculateBranchDepth = (questionId: string, visited = new Set<string>()): number => {
      if (visited.has(questionId)) return 0;
      visited.add(questionId);

      const branchTargets = branches.get(questionId) || [];
      if (!branchTargets.length) return 1;

      // Calculate max depth of all branches from this question
      const branchDepths = branchTargets.map(target =>
          calculateBranchDepth(target, new Set(visited))
      );

      return 1 + Math.max(...branchDepths, 0);
    };

    // Assign weights to all questions
    questionSequence.forEach(question => {
      if (question && question.id) {
        weights[question.id] = calculateBranchDepth(question.id);
      }
    });

    setQuestionWeight(weights);
  }, [questionSequence]);

  // Enhanced progress calculation that considers question weights
  const calculateProgress = useCallback(() => {
    // If we're using the smooth progress hook, return that value
    if (currentStageName === 'estimate') {
      return 100;
    }
    return smoothProgress;
  }, [smoothProgress, currentStageName]);

  const loadCurrentQuestionSet = () => {
    if (!questionSets[currentSetIndex]) {
      handleComplete();
      return;
    }

    try {
      const currentSet = questionSets[currentSetIndex];
      if (!currentSet?.questions?.length) {
        throw new Error('No questions available for this category');
      }

      const sortedQuestions = currentSet.questions.sort((a, b) => a.order - b.order);
      setQuestionSequence(sortedQuestions);
      setCurrentQuestionId(sortedQuestions[0].id);
      setIsLoadingQuestions(false);
    } catch (error) {
      console.error('Error loading question set:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load questions",
        variant: "destructive",
      });
      moveToNextQuestionSet();
    }
  };

  const handleBranchTransition = () => {
    if (queuedNextQuestions.length > 0) {
      setCurrentQuestionId(queuedNextQuestions[0]);
      setQueuedNextQuestions(prev => prev.slice(1));
      setPendingBranchTransition(false);
    } else {
      console.log('coming from branch transition');
      moveToNextQuestionSet();
      setPendingBranchTransition(false);
    }
  };

  const moveToNextQuestionSet = () => {
    console.log('Moving to next question set, current index:', currentSetIndex, 'total sets:', questionSets.length);
    if (currentSetIndex < questionSets.length - 1) {
      console.log('Moving to next Questions set, Thanks You');
      setCurrentSetIndex(prev => prev + 1);
    } else {
      console.log('Not Moving to next Questions set,No Thanks You');
      handleComplete();
    }
  };

  const handleSingleChoiceNavigation = (currentQuestion: Question, selectedValue: string) => {

    // Handle measurement_input type which might not have traditional options
    if (currentQuestion.type === 'measurement_input') {
      if (currentQuestion.next === 'NEXT_BRANCH') {
        setPendingBranchTransition(true);
      } else if (currentQuestion.next === 'END' || !currentQuestion.next) {
        moveToNextQuestionSet();
      } else if (currentQuestion.next) {
        setCurrentQuestionId(currentQuestion.next);
      } else {
        const currentIndex = questionSequence.findIndex(q => q.id === currentQuestion.id);
        if (currentIndex < questionSequence.length - 1) {
          setCurrentQuestionId(questionSequence[currentIndex + 1].id);
        } else {
          moveToNextQuestionSet();
        }
      }
      return;
    }

    // Safety check for options
    if (!currentQuestion.options || !Array.isArray(currentQuestion.options)) {
      console.warn(`Question ${currentQuestion.id} has no options array`);
      moveToNextQuestionSet();
      return;
    }

    const selectedOption = currentQuestion.options.find(
        opt => opt && opt.value && opt.value.toLowerCase() === selectedValue.toLowerCase()
    );

    if (!selectedOption) {
      console.warn(`Selected option not found for value: ${selectedValue}`);
      moveToNextQuestionSet();
      return;
    }

    if (selectedOption.next === 'NEXT_BRANCH') {
      setPendingBranchTransition(true);
    } else if (selectedOption.next === 'END' || !selectedOption.next) {
      moveToNextQuestionSet();
    } else if (selectedOption.next) {
      setCurrentQuestionId(selectedOption.next);
    } else {
      const currentIndex = questionSequence.findIndex(q => q.id === currentQuestion.id);
      if (currentIndex < questionSequence.length - 1) {
        setCurrentQuestionId(questionSequence[currentIndex + 1].id);
      } else {
        moveToNextQuestionSet();
      }
    }
  };

  const handleAnswer = async (questionId: string, selectedValues: string[]) => {
    const currentQuestion = questionSequence.find(q => q.id === questionId);
    if (!currentQuestion) return;

    const currentSet = questionSets[currentSetIndex];

    // For measurement_input type which might not have options in the traditional sense
    let options = [];
    if (currentQuestion.type === 'measurement_input') {
      // Create a synthetic option for the measurement value
      options = selectedValues.map(value => ({
        label: value,
        value: value,
        next: currentQuestion.next
      }));
    } else if (currentQuestion.options && Array.isArray(currentQuestion.options)) {
      // For traditional option-based questions
      options = currentQuestion.options
          .filter(opt => opt && selectedValues.includes(opt.value))
          .map(opt => ({
            label: opt.label,
            value: opt.value,
            next: opt.next
          }));
    }

    const questionAnswer: QuestionAnswer = {
      question: currentQuestion.question,
      type: currentQuestion.type,
      answers: selectedValues,
      options: options
    };

    // For measurement_input, add the unit if available
    if ((currentQuestion.type === 'measurement_input' || currentQuestion.type==='camera_measurement') && currentQuestion.unit) {
      (questionAnswer as any).unit = currentQuestion.unit;
    }

    setAnswers(prev => ({
      ...prev,
      [currentSet.category]: {
        ...prev[currentSet.category],
        [questionId]: questionAnswer
      }
    }));


    if (currentQuestion.type == 'single_choice' || currentQuestion.type == 'yes_no' ){
      //handleSingleChoiceNavigation(currentQuestion, selectedValues[0]);
    }
  };

  // Generic handler for input-type questions (text_input, number_input)
  const handleInputTypeNext = (questionType: string) => {
    const currentQuestion = questionSequence.find(q => q.id === currentQuestionId);
    if (!currentQuestion) {
      return;
    }

    console.log(`Handling ${questionType} next for question:`, currentQuestion.id);

    // Find the current answer
    const currentSet = questionSets[currentSetIndex];
    const currentSetAnswers = answers[currentSet.category] || {};
    const selectedValue = currentSetAnswers[currentQuestion.id]?.answers[0] || null;

    if (!selectedValue) {
      console.warn(`No value provided for ${questionType} question`);
      return;
    }

    // Find the specific input option if it exists
    const inputOption = currentQuestion.options?.find(
        opt => opt && opt.type === questionType
    );

    // Navigate based on the option or question properties
    if (inputOption?.next === 'NEXT_BRANCH') {
      setPendingBranchTransition(true);
    } else if (inputOption?.next === 'END' || !inputOption?.next) {
      // If no input option next or it's END, try the question next
      if (currentQuestion.next === 'NEXT_BRANCH') {
        setPendingBranchTransition(true);
      } else if (currentQuestion.next === 'END' || !currentQuestion.next) {
        moveToNextQuestionSet();
      } else {
        setCurrentQuestionId(currentQuestion.next);
      }
    } else if (inputOption?.next) {
      setCurrentQuestionId(inputOption.next);
    } else {
      // If no navigation is specified, try to go to the next question in sequence
      const currentIndex = questionSequence.findIndex(q => q.id === currentQuestion.id);
      if (currentIndex < questionSequence.length - 1) {
        setCurrentQuestionId(questionSequence[currentIndex + 1].id);
      } else {
        moveToNextQuestionSet();
      }
    }
  };

  // Handler for text_input questions
  const handleTextInputNext = () => {
    handleInputTypeNext('text_input');
  };

  // Handler for number_input questions
  const handleNumberInputNext = () => {
    handleInputTypeNext('number_input');
  };

  // Handler for camera_measurement questions
  const handleCameraMeasurementNext = () => {
    const currentQuestion = questionSequence.find(q => q.id === currentQuestionId);
    if (!currentQuestion) {
      return;
    }

    console.log('Handling camera measurement next for question:', currentQuestion.id);

    // Find the selected option for camera_measurement
    const currentSet = questionSets[currentSetIndex];
    const currentSetAnswers = answers[currentSet.category] || {};
    const selectedValue = currentSetAnswers[currentQuestion.id]?.answers[0] || null;

    if (!selectedValue) {
      console.warn('No value selected for camera measurement question');
      return;
    }

    // Find the camera_measurement option to get its 'next' property
    const cameraMeasurementOption = currentQuestion.options?.find(
        opt => opt && opt.type === 'camera_measurement'
    );

    // Alternatively, find a number_input option if that's what was used
    const numberInputOption = currentQuestion.options?.find(
        opt => opt && opt.type === 'number_input'
    );

    // Use the appropriate option's 'next' value
    const optionToUse = cameraMeasurementOption || numberInputOption;

    if (optionToUse?.next === 'NEXT_BRANCH') {
      setPendingBranchTransition(true);
    } else if (optionToUse?.next === 'END' || !optionToUse?.next) {
      // If no specific option next is found, try the question's next property
      if (currentQuestion.next === 'NEXT_BRANCH') {
        setPendingBranchTransition(true);
      } else if (currentQuestion.next === 'END' || !currentQuestion.next) {
        moveToNextQuestionSet();
      } else {
        setCurrentQuestionId(currentQuestion.next);
      }
    } else if (optionToUse?.next) {
      setCurrentQuestionId(optionToUse.next);
    } else {
      // If no navigation is specified, try to go to the next question in sequence
      const currentIndex = questionSequence.findIndex(q => q.id === currentQuestion.id);
      if (currentIndex < questionSequence.length - 1) {
        setCurrentQuestionId(questionSequence[currentIndex + 1].id);
      } else {
        moveToNextQuestionSet();
      }
    }
  };

  // Handler for yes_no questions (simplified version of single_choice)
  const handleYesNoNext = () => {
    const currentQuestion = questionSequence.find(q => q.id === currentQuestionId);
    if (!currentQuestion) {
      return;
    }

    console.log('Handling yes_no next for question:', currentQuestion.id);

    const currentSet = questionSets[currentSetIndex];
    const currentSetAnswers = answers[currentSet.category] || {};
    const selectedValue = currentSetAnswers[currentQuestion.id]?.answers[0] || null;

    if (!selectedValue) {
      console.warn('No value selected for yes_no question');
      return;
    }

    // Find the selected option
    const selectedOption = currentQuestion.options?.find(
        opt => opt && opt.value === selectedValue
    );

    if (selectedOption?.next === 'NEXT_BRANCH') {
      setPendingBranchTransition(true);
    } else if (selectedOption?.next === 'END' || !selectedOption?.next) {
      moveToNextQuestionSet();
    } else if (selectedOption?.next) {
      setCurrentQuestionId(selectedOption.next);
    } else {
      // If no navigation is specified, try to go to the next question in sequence
      const currentIndex = questionSequence.findIndex(q => q.id === currentQuestion.id);
      if (currentIndex < questionSequence.length - 1) {
        setCurrentQuestionId(questionSequence[currentIndex + 1].id);
      } else {
        moveToNextQuestionSet();
      }
    }
  };

  const handleMultipleChoiceNext = async () => {
    const currentQuestion = questionSequence.find(q => q.id === currentQuestionId);
    if (!currentQuestion) {
      return;
    }

    // Safety check for options
    if (!currentQuestion.options || !Array.isArray(currentQuestion.options)) {
      console.warn(`Question ${currentQuestion.id} has no options array in handleMultipleChoiceNext`);
      moveToNextQuestionSet();
      return;
    }

    const currentSet = questionSets[currentSetIndex];
    const currentSetAnswers = answers[currentSet.category] || {};
    const selectedValues = currentSetAnswers[currentQuestion.id]?.answers || [];

    if (selectedValues.length === 0) return;

    const nextQuestions = selectedValues.reduce((acc: string[], value: string) => {
      const option = currentQuestion.options.find(opt => opt && opt.value === value);
      if (option?.next && option.next !== 'END' && option.next !== 'NEXT_BRANCH') {
        acc.push(option.next);
      }
      return acc;
    }, []);

    const uniqueNextQuestions = Array.from(new Set(nextQuestions));

    if (uniqueNextQuestions.length > 0) {
      setCurrentQuestionId(uniqueNextQuestions[0]);
      if (uniqueNextQuestions.length > 1) {
        setQueuedNextQuestions(uniqueNextQuestions.slice(1));
      }
    } else {
      const shouldMoveToNextBranch = selectedValues.some(value => {
        const option = currentQuestion.options.find(opt => opt && opt.value === value);
        return option?.next === 'NEXT_BRANCH';
      });

      if (shouldMoveToNextBranch) {
        setPendingBranchTransition(true);
      } else {
        moveToNextQuestionSet();
      }
    }
  };

  const handleComplete = async () => {
    if (currentSetIndex < questionSets.length - 1) {
      moveToNextQuestionSet();
      return;
    }

    if (isGeneratingEstimate) {
      console.log('Already generating estimate, skipping...');
      return;
    }

    console.log('Starting estimate generation with answers:', answers);
    setIsGeneratingEstimate(true);

    try {
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

      // First, create the lead
      const leadData: LeadInsert = {
        project_description: projectDescription || 'New project',
        project_title: `${questionSets[0]?.category || 'New'} Project`,
        answers: answersForDb as Json,
        category: questionSets[0]?.category,
        status: 'pending',
        contractor_id: contractorId, // Add contractorId
        project_images: uploadedPhotos, // Add uploadedPhotos
      };

      console.log('Creating lead with data:', leadData);

      const { data: lead, error: leadError } = await supabase
          .from('leads')
          .insert(leadData)
          .select()
          .single();

      if (leadError) {
        console.error('Error creating lead:', leadError);
        throw leadError;
      }

      if (!lead?.id) {
        throw new Error('Failed to create lead - no ID returned');
      }

      const address = await supabase.from('contractors').select('business_address').eq('id',contractorId).single();
      let address_string="";
      if (!address.data || !address.data.business_address) {
        try {
          const response = await fetch('https://ipapi.co/json/?key=AzZ4jUj0F5eFNjhgWgLpikGJxYdf5IzcsfBQSiOMw69RtR8JzX');

          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }

          const ipAddressData = await response.json();

          address_string=`${ipAddressData.city}, ${ipAddressData.region}, ${ipAddressData.country_name}`;

        } catch (error) {
          console.error('Error fetching IP address data:', error);
          throw error;
        }
      } else {
        address_string=address.data.business_address;
      }

      // Then, generate the estimate
      const { error: generateError } = await supabase.functions.invoke('generate-estimate', {
        body: {
          leadId: lead.id,
          contractorId: contractorId,
          projectDescription: projectDescription,
          category: questionSets[0]?.category,
          imageUrl: uploadedImageUrl,
          projectImages: uploadedPhotos,
          answers: answersForDb,
          address: address_string
        }
      });

      if (generateError) {
        console.error('Error generating estimate:', generateError);
        throw generateError;
      }

      onComplete(answers, lead.id);
    } catch (error) {
      console.error('Error completing questions:', error);
      toast({
        title: "Error",
        description: "Failed to process your answers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingEstimate(false);
    }
  };

  useEffect(() => {
    loadCurrentQuestionSet();
  }, [currentSetIndex, questionSets]);

  useEffect(() => {
    if (pendingBranchTransition) {
      console.log('Pending branch transition, handling...');
      handleBranchTransition();
    }
  }, [pendingBranchTransition]);

  // Analyze question weights when the question sequence changes
  useEffect(() => {
    if (!isLoadingQuestions && questionSequence.length > 0) {
      analyzeQuestionWeights();
    }
  }, [questionSequence, isLoadingQuestions, analyzeQuestionWeights]);

  // Update the progress whenever it changes
  useEffect(() => {
    const progress = calculateProgress();
    if (!isNaN(progress)) {
      onProgressChange(progress);
    }
  }, [calculateProgress, onProgressChange]);

  return {
    currentQuestion: questionSequence.find(q => q.id === currentQuestionId),
    currentSet: questionSets[currentSetIndex],
    currentSetAnswers: answers[questionSets[currentSetIndex]?.category] || {},
    isLoadingQuestions,
    isGeneratingEstimate,
    hasFollowUpQuestion: currentSetIndex < questionSets.length - 1 ||
        queuedNextQuestions.length > 0 ||
        (currentQuestionId && questionSequence.find(q => q.id === currentQuestionId)?.type === 'multiple_choice' &&
            questionSequence.find(q => q.id === currentQuestionId)?.options?.some(opt => opt?.next)),
    currentStage: currentSetIndex + 1,
    totalStages: questionSets.length,
    handleAnswer,
    handleSingleChoiceNavigation,
    handleMultipleChoiceNext,
    handleCameraMeasurementNext,
    handleTextInputNext,
    handleNumberInputNext,
    handleYesNoNext,
    calculateProgress,
    handleComplete
  };
};