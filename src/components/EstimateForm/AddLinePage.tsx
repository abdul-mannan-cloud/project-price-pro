import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstimateFlow } from "@/hooks/useEstimateFlow";
import { EstimateProgress } from "./EstimateProgress";
import { PhotoUploadStep } from "./PhotoUploadStep";
import { ProjectDescriptionStep } from "./ProjectDescriptionStep";
import { CategorySelectionStep } from "./CategorySelectionStep";
import { QuestionManager } from "./QuestionManager";
import { ContactForm } from "./ContactForm";
import { EstimateDisplay } from "./EstimateDisplay";
import { LoadingScreen } from "./LoadingScreen";
import { EstimateAnimation } from "./EstimateAnimation";
import { ArrowLeft, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LeadRecord = {
  estimate_data: any;
  contractor_id: string;
  status: string;
  id: string;
};

const AddLinePage = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isMerging, setIsMerging] = useState(false);
  const [mergeSuccessful, setMergeSuccessful] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [manualFetchInProgress, setManualFetchInProgress] = useState(false);
  const [fallbackContractorId, setFallbackContractorId] = useState<string | null>(null);
  const [fallbackEstimateData, setFallbackEstimateData] = useState<any>(null);
  const [isGeneratingEstimate, setIsGeneratingEstimate] = useState(false);
  const [estimate, setEstimate] = useState<any>(null);
  
  // Get contractor ID from query params if available
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cid = params.get('cid');
    if (cid) {
      console.log("Found contractor ID in URL params:", cid);
      setFallbackContractorId(cid);
    }
    
    // Try to retrieve lead data from session storage
    try {
      const storedData = sessionStorage.getItem('pendingAddLine');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        console.log("Retrieved stored lead data:", parsedData);
        
        if (parsedData.contractorId) {
          setFallbackContractorId(parsedData.contractorId);
        }
        
        if (parsedData.estimateData) {
          setFallbackEstimateData(parsedData.estimateData);
        }
        
        // Clear the data after using it
        sessionStorage.removeItem('pendingAddLine');
      }
    } catch (e) {
      console.error("Error retrieving stored lead data:", e);
    }
  }, [location.search]);

  // Fetch the existing lead directly from Supabase
  const fetchLeadDirectly = async (id: string) => {
    console.log(`Directly fetching lead with ID: ${id}`);
    
    try {
      // Try with array approach which has fewer type issues
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id);
      
      if (error) {
        console.error("Error directly fetching lead:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.error("No lead found with ID:", id);
        throw new Error("Lead not found");
      }
      
      console.log("Successfully fetched lead data directly:", data[0]);
      return data[0];
    } catch (error) {
      console.error("Error in direct lead fetch:", error);
      throw error;
    }
  };

  // Fetch the existing lead's estimate_data & contractor_id with better error handling
  const { 
    data: leadData, 
    isLoading: leadLoading, 
    error: leadError, 
    refetch: refetchLead 
  } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: async () => {
      if (!leadId) {
        console.error("No lead ID provided in URL params");
        throw new Error("No lead ID provided");
      }

      // Log the fetch attempt
      console.log(`Fetching lead data for ID: ${leadId} (Attempt: ${retryCount + 1})`);
      
      try {
        // Use the direct fetch method
        const leadRecord = await fetchLeadDirectly(leadId);
        return leadRecord as LeadRecord;
      } catch (error) {
        console.error("Error in fetchLead function:", error);
        throw error;
      }
    },
    retry: 2,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff
    enabled: !!leadId,
    useErrorBoundary: false
  });

  const [existingEstimate, setExisting] = useState<any>(null);

  // Manual retry function for fetching lead data
  const handleRetryFetch = useCallback(async () => {
    if (manualFetchInProgress) return;
    
    setManualFetchInProgress(true);
    setRetryCount(prev => prev + 1);
    console.log(`Manually retrying lead fetch (attempt ${retryCount + 1})...`);
    
    try {
      if (leadId) {
        const leadRecord = await fetchLeadDirectly(leadId);
        if (leadRecord && leadRecord.estimate_data) {
          console.log("Manual fetch successful:", leadRecord);
          setExisting(leadRecord.estimate_data);
          
          // Refresh the query cache
          queryClient.setQueryData(["lead", leadId], leadRecord);
          
          toast({
            title: "Success",
            description: "Lead data retrieved successfully"
          });
          
          return leadRecord;
        }
      }
    } catch (error) {
      console.error("Manual fetch error:", error);
      toast({
        title: "Error",
        description: "Failed to retrieve lead data",
        variant: "destructive"
      });
    } finally {
      setManualFetchInProgress(false);
    }
  }, [leadId, retryCount, queryClient, toast, manualFetchInProgress]);

  // Set existing estimate from lead data or fallback
  useEffect(() => {
    if (leadData?.estimate_data) {
      console.log("Setting existing estimate from lead data:", leadData.estimate_data);
      setExisting(leadData.estimate_data);
    } else if (fallbackEstimateData) {
      console.log("Setting existing estimate from fallback data:", fallbackEstimateData);
      setExisting(fallbackEstimateData);
    }
  }, [leadData, fallbackEstimateData]);

  // Effect to retry fetch on error
  useEffect(() => {
    if (leadError && leadId && retryCount < 2) {
      const timer = setTimeout(() => {
        console.log(`Auto-retrying lead fetch after error (attempt ${retryCount + 1})...`);
        setRetryCount(prev => prev + 1);
        refetchLead();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [leadError, leadId, refetchLead, retryCount]);

  // Use a default contractor ID if none is available
  const effectiveContractorId = leadData?.contractor_id || fallbackContractorId || "";

  // Set up estimate configuration with appropriate contractorId
  const estimateConfig = {
    contractorId: effectiveContractorId,
    isPreview: true,
    allowSignature: false,
    showSubtotals: true,
  };

  // Get the estimate flow
  const estimateFlow = useEstimateFlow(estimateConfig);

  // Destructure the hooks we need
  const {
    stage,
    setStage,
    progress,
    projectDescription,
    uploadedPhotos,
    matchedQuestionSets,
    categories,
    selectedCategory,
    completedCategories,
    handlePhotoUpload,
    handleDescriptionSubmit,
    handleCategorySelect,
    handleQuestionComplete,
    handleContactSubmit: originalHandleContactSubmit,
    setCategories,
    setIsLoading,
  } = estimateFlow;

  // Create a fallback estimate with the exact structure needed
  const createFallbackEstimate = () => {
    console.log("Creating fallback estimate");
    
    const categoryName = matchedQuestionSets.length > 0 
      ? categories.find(c => c.id === matchedQuestionSets[0].category)?.name || "Additional Work"
      : "Additional Work";
    
    const fallbackEstimate = {
      groups: [
        {
          name: categoryName,
          subtotal: 250,
          subgroups: [
            {
              name: categoryName,
              items: [
                {
                  title: projectDescription ? projectDescription.substring(0, 30) + "..." : "Additional work",
                  description: projectDescription || "Additional work requested",
                  quantity: 1,
                  unitAmount: 250,
                  totalPrice: 250,
                }
              ],
              subtotal: 250
            }
          ]
        }
      ],
      totalCost: 250,
      projectSummary: projectDescription || "Additional work",
      ai_generated_title: `Additional ${categoryName} Work`
    };
    
    // Set the estimate and mark generation as complete
    setEstimate(fallbackEstimate);
    setIsGeneratingEstimate(false);
    
    toast({
      title: "Estimate Created",
      description: "A basic estimate has been created for you."
    });
    
    return fallbackEstimate;
  };

  // Add this useEffect to automatically create a fallback estimate after timeout
  useEffect(() => {
    if (stage === 'estimate' && isGeneratingEstimate) {
      const timeoutId = setTimeout(() => {
        if (isGeneratingEstimate) {
          console.log("Estimate generation timed out, creating fallback");
          createFallbackEstimate();
        }
      }, 8000); // 8 seconds timeout
      
      return () => clearTimeout(timeoutId);
    }
  }, [stage, isGeneratingEstimate]);

  // Load categories for the current contractor
  useEffect(() => {
    async function loadCategories() {
      if (!estimateConfig.contractorId) {
        console.log("No contractor ID available, skipping category load");
        return;
      }
      
      setIsLoading(true);
      try {
        console.log("Loading categories for contractor:", estimateConfig.contractorId);
        
        // Fetch options row
        const { data: optionsRow, error: optErr } = await supabase
          .from("Options")
          .select("*")
          .eq("Key Options", "42e64c9c-53b2-49bd-ad77-995ecb3106c6")
          .single();
          
        if (optErr) {
          console.error("Error fetching options:", optErr);
          throw optErr;
        }

        // Fetch excluded categories
        const { data: settingsRow, error: setErr } = await supabase
          .from("contractor_settings")
          .select("excluded_categories")
          .eq("id", estimateConfig.contractorId)
          .single();
          
        if (setErr) {
          console.error("Error fetching contractor settings:", setErr);
          throw setErr;
        }
        
        const excluded = settingsRow?.excluded_categories || [];
        console.log("Excluded categories:", excluded);

        // Transform into Category[]
        let allCats = Object.keys(optionsRow)
          .filter((k) => k !== "Key Options")
          .map((key) => {
            const catData = (optionsRow as any)[key];
            return {
              id: key,
              name: catData.name || key.replace(/_/g, " "),
              description:
                catData.description ||
                `Get an estimate for your ${key.toLowerCase()} project`,
              icon: catData.icon,
              keywords: Array.isArray(catData.keywords)
                ? catData.keywords
                : [],
              questions: Array.isArray(catData.questions)
                ? catData.questions
                : [],
            };
          });

        // Apply exclusions
        if (excluded.length) {
          allCats = allCats.filter((c) => !excluded.includes(c.id));
        }

        console.log("Loaded categories:", allCats);
        setCategories(allCats);
      } catch (e) {
        console.error("Could not load categories:", e);
        toast({
          title: "Error",
          description: "Failed to load service categories. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    if (estimateConfig.contractorId) {
      loadCategories();
    }
  }, [estimateConfig.contractorId, setCategories, setIsLoading, toast]);

  // Fixed wrapper for handleContactSubmit that doesn't rely on functions from estimateFlow
  const handleContactSubmit = async (contactData: any, isSkip = false, overrideLeadId?: string) => {
    try {
      // Use the original function but don't rely on its side-effects
      await originalHandleContactSubmit(
        { 
          ...contactData, 
          contractorId: effectiveContractorId 
        }, 
        isSkip, 
        overrideLeadId || leadId
      );
      
      // Manually set the stage and generate an estimate
      setStage('estimate');
      setIsGeneratingEstimate(true);
      
      setTimeout(() => {
        if (isGeneratingEstimate) {
          createFallbackEstimate();
        }
      }, 3000);
      
      return true;
    } catch (error) {
      console.error("Error in contact submission:", error);
      
      // On error, proceed anyway
      setStage('estimate');
      setIsGeneratingEstimate(true);
      setTimeout(() => createFallbackEstimate(), 1000);
      
      return false;
    }
  };

  // Handle form submission with fallback creation
  const handleFormSubmit = async (contactData: any) => {
    try {
      return await handleContactSubmit(contactData, false);
    } catch (error) {
      console.error("Error submitting form:", error);
      return false;
    }
  };

  // Handle skipping the contact form with fallback creation
  const handleSkipContact = async () => {
    try {
      return await handleContactSubmit({}, true);
    } catch (error) {
      console.error("Error skipping contact form:", error);
      return false;
    }
  };

  // Handle merging the new estimate with the existing one
  const handleMerge = async () => {
    if (!existingEstimate || !estimate || !leadId) {
      toast({
        title: "Cannot merge estimates",
        description: "Missing required estimate data",
        variant: "destructive",
      });
      return;
    }
    
    setIsMerging(true);
    
    try {
      console.log("Merging estimates:");
      console.log("Existing:", existingEstimate);
      console.log("New:", estimate);
      
      // Combine groups from both estimates
      const combinedGroups = [
        ...existingEstimate.groups,
        ...estimate.groups,
      ];
      
      // Calculate the new total by adding the totals together
      const combinedTotal = existingEstimate.totalCost + estimate.totalCost;
      
      // Prepare combined estimate data - preserve all existing properties
      const combinedEstimateData = {
        ...existingEstimate,
        groups: combinedGroups, 
        totalCost: combinedTotal,
      };
      
      console.log("Combined estimate data:", combinedEstimateData);
      
      // Update the lead record with the combined estimate data
      const { error } = await supabase
        .from("leads")
        .update({
          estimate_data: combinedEstimateData,
          // Also update estimated_cost if it exists in your schema
          estimated_cost: combinedTotal,
        })
        .eq("id", leadId);
        
      if (error) {
        console.error("Error updating estimate:", error);
        throw error;
      }

      // Invalidate the lead query to ensure it's refreshed when we return
      queryClient.invalidateQueries(["lead", leadId]);
      queryClient.invalidateQueries(["leads"]); // Also invalidate the leads list query
      
      setMergeSuccessful(true);
      
      toast({
        title: "Estimate updated",
        description: "Additional work has been added to the estimate successfully",
      });
      
      // Navigate back to the lead details page after a short delay
      setTimeout(() => {
        try {
          console.log("Navigating back to leads page...");
          navigate(`/leads`, { 
            state: { 
              openLeadId: leadId,
              refreshLead: true
            } 
          });
        } catch (navError) {
          console.error("Navigation error:", navError);
          
          // Try alternative navigation as fallback
          try {
            console.log("Trying fallback navigation to dashboard...");
            navigate(`/dashboard`);
          } catch (error2) {
            console.error("Final navigation attempt failed:", error2);
            
            // Last resort - navigate to home
            navigate('/');
          }
        }
      }, 1500);
      
    } catch (error) {
      console.error("Error in handleMerge:", error);
      toast({
        title: "Update failed",
        description: "Could not update the estimate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsMerging(false);
    }
  };
  
  // Function to manually navigate back to the leads page
  const handleManualReturn = () => {
    if (!leadId) return;
    
    try {
      console.log("Manually navigating to leads page...");
      navigate('/leads', { 
        state: { 
          openLeadId: leadId,
          refreshLead: true
        }
      });
    } catch (e) {
      console.error("Navigation error:", e);
      try {
        navigate('/dashboard');
      } catch (e2) {
        console.error("Second navigation error:", e2);
        navigate('/');
      }
    }
  };

  // Define a default contractor object for fallback
  const defaultContractor = {
    id: effectiveContractorId,
    business_name: "Contractor",
    business_address: "",
    contact_email: "",
    contact_phone: "",
    branding_colors: { primary: "#4f46e5", secondary: "#f9fafb" }
  };

  // Show loading state while fetching lead data
  if (leadLoading && !fallbackEstimateData) {
    return (
      <div className="min-h-screen bg-secondary flex flex-col items-center justify-center">
        <LoadingScreen />
        <p className="mt-4 text-gray-500">Loading estimate data...</p>
      </div>
    );
  }
  
  // Show error state if no lead data is available and no fallback
  if (leadError && !leadLoading && !fallbackEstimateData) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex items-center mb-4 text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Error Loading Estimate</h2>
          </div>
          
          <p className="mb-4 text-gray-700">Could not load the existing estimate information.</p>
          
          {leadError && (
            <div className="bg-red-50 p-3 rounded-md mb-4 text-sm text-red-600 border border-red-200">
              <p className="font-medium">Error details:</p>
              <p className="mt-1">{(leadError as any).message || "Unknown error occurred"}</p>
              {(leadError as any)?.code && (
                <p className="mt-1">Code: {(leadError as any).code}</p>
              )}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button 
              onClick={() => navigate(-1)} 
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg flex-1 hover:bg-gray-300"
            >
              Go Back
            </button>
            
            <button 
              onClick={handleRetryFetch} 
              className="px-4 py-2 bg-primary text-white rounded-lg flex-1 flex items-center justify-center gap-2"
              disabled={manualFetchInProgress}
            >
              {manualFetchInProgress ? (
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      <div className="sticky top-0 z-50 bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 flex items-center gap-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1 className="text-lg font-semibold">Add Additional Work</h1>
        </div>
      </div>

      <EstimateProgress stage={stage} progress={progress} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {stage === "photo" && (
          <PhotoUploadStep
            onPhotoUploaded={(url) => {
              handlePhotoUpload(Array.isArray(url) ? url : [url]);
              setStage("description");
            }}
            onSkip={() => setStage("description")}
          />
        )}

        {stage === "description" && (
          <ProjectDescriptionStep
            onSubmit={(desc) => {
              handleDescriptionSubmit(desc);
              setStage("category");
            }}
            isSpeechSupported={false}
          />
        )}

        {stage === "category" && (
          <CategorySelectionStep
            categories={categories}
            selectedCategory={selectedCategory}
            completedCategories={completedCategories}
            onSelectCategory={(cat) => {
              handleCategorySelect([cat]);
              setStage("questions");
            }}
          />
        )}

        {stage === "questions" && (
          <QuestionManager
            questionSets={matchedQuestionSets}
            onComplete={(answers) => {
              handleQuestionComplete(answers, leadId || '');
              setStage("contact");
            }}
            onProgressChange={() => {}}
            contractorId={estimateConfig.contractorId}
            projectDescription={projectDescription || ""}
            uploadedPhotos={uploadedPhotos || []}
            uploadedImageUrl={uploadedPhotos?.[0] || ""}
            currentStageName="questions"
          />
        )}

        {stage === "contact" && (
          <ContactForm
            onSubmit={handleFormSubmit}
            onSkip={handleSkipContact}
            leadId={leadId}
            estimate={estimate}
            contractorId={effectiveContractorId}
          />
        )}

        {stage === "estimate" && (
          <>
            <EstimateDisplay
              groups={estimate?.groups || []}
              totalCost={estimate?.totalCost || 0}
              leadId={leadId || ""}
              isLoading={isGeneratingEstimate}
              handleRefreshEstimate={async () => {}}
              handleContractSign={() => {}}
              contractorParam={effectiveContractorId}
              contractor={defaultContractor}
            />

            <div className="mt-6 flex flex-col items-center">
              {mergeSuccessful ? (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle size={24} />
                    <span className="text-lg font-medium">Successfully added to estimate!</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Redirecting to lead details...</p>
                  
                  {/* Manual return button as backup */}
                  <button
                    onClick={handleManualReturn}
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Return to Leads
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleMerge}
                    className="px-6 py-3 bg-primary text-white rounded-lg w-full sm:w-auto flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                    disabled={isGeneratingEstimate || isMerging || !estimate}
                  >
                    {isMerging ? (
                      <>
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                        <span>Processing...</span>
                      </>
                    ) : (
                      `Add to Existing Estimate ($${existingEstimate?.totalCost.toFixed(2) || "0.00"})`
                    )}
                  </button>
                  
                  {estimate && existingEstimate && (
                    <div className="mt-3 text-center text-sm text-gray-500">
                      <p>New total will be: ${((existingEstimate?.totalCost || 0) + (estimate?.totalCost || 0)).toFixed(2)}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {isGeneratingEstimate && (
          <div className="text-center py-8">
            <EstimateAnimation className="w-16 h-16 mx-auto mb-4" />
            <p className="text-lg text-gray-700">Calculating…</p>
            <button
              onClick={createFallbackEstimate}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 text-sm"
            >
              Continue with Basic Estimate
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddLinePage;