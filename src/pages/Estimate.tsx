import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {ArrowLeft} from "lucide-react";
import {cn} from "@/lib/utils";
import {useEstimateFlow} from "@/hooks/useEstimateFlow";
import {EstimateProgress} from "@/components/EstimateForm/EstimateProgress";
import {ContactForm} from "@/components/EstimateForm/ContactForm";
import {EstimateDisplay} from "@/components/EstimateForm/EstimateDisplay";
import {LoadingScreen} from "@/components/EstimateForm/LoadingScreen";
import {QuestionManager} from "@/components/EstimateForm/QuestionManager";
import {PhotoUploadStep} from "@/components/EstimateForm/PhotoUploadStep";
import {ProjectDescriptionStep} from "@/components/EstimateForm/ProjectDescriptionStep";
import {CategorySelectionStep} from "@/components/EstimateForm/CategorySelectionStep";
import {EstimateAnimation} from "@/components/EstimateForm/EstimateAnimation";
import {Category, EstimateConfig} from "@/types/estimate";
import {EstimateSkeleton} from "@/components/EstimateForm/EstimateSkeleton";
import {MultiStepSkeleton} from "@/components/EstimateForm/MultiStepSkeleton";
import {useContractor} from "@/hooks/useContractor.tsx";

const DEFAULT_CONTRACTOR_ID = "82499c2f-960f-4042-b277-f86ea2d99929";

// Validate UUID format
const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

const setColorVariables = (colors: { primary: string; secondary: string }) => {
    const {primary, secondary} = colors;
    const primaryHex = primary.replace('#', '');
    const [r, g, b] = [
        parseInt(primaryHex.slice(0, 2), 16),
        parseInt(primaryHex.slice(2, 4), 16),
        parseInt(primaryHex.slice(4, 6), 16)
    ];

    const colorVars = {
        '--primary': primary,
        '--primary-foreground': '#FFFFFF',
        '--secondary': secondary,
        '--secondary-foreground': '#1d1d1f',
        '--primary-100': `rgba(${r}, ${g}, ${b}, 0.1)`,
        '--primary-200': `rgba(${r}, ${g}, ${b}, 0.2)`,
        '--primary-300': `rgba(${r}, ${g}, ${b}, 0.4)`,
        '--primary-400': `rgba(${r}, ${g}, ${b}, 0.6)`,
        '--primary-500': `rgba(${r}, ${g}, ${b}, 0.8)`,
        '--primary-600': primary,
        '--primary-700': `rgba(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)}, 1)`,
    };

    Object.entries(colorVars).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
    });
};

function GlobalBrandingLoader({contractorId}) {


    useQuery({
        queryKey: ["globalBranding", contractorId],
        queryFn: async () => {
            const {data: contractor, error} = await supabase
                .from("contractors")
                .select("branding_colors")
                .eq("id", contractorId)
                .maybeSingle();

            if (error || !contractor) {
                console.error(error ? `Error fetching contractor: ${error.message}` :
                    `No contractor found for user: `);
                return null;
            }


            const colors = contractor.branding_colors as { primary: string; secondary: string } | null;
            if (colors) {
                setColorVariables(colors);
            }
            return colors;
        },
    });

    return null;
}

const EstimatePage = () => {
    const navigate = useNavigate();
    const {contractorId} = useParams();
    const [isSpeechSupported, setIsSpeechSupported] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [authUserId, setAuthUserId] = useState<string | null>(null);
    const [isRefreshingEstimate, setIsRefreshingEstimate] = useState(false);
    const {
        updateContractorId,
    } = useContractor();

    useEffect(() => {
        updateContractorId(contractorId);
    }, []);

    // Get the contractor ID from the URL first
    const urlContractorId = (() => {
        try {
            if (!contractorId || contractorId === ":contractorId?" || contractorId === "undefined") {
                return DEFAULT_CONTRACTOR_ID;
            }

            // Clean the ID without decoding/encoding
            return isValidUUID(contractorId) ? contractorId : DEFAULT_CONTRACTOR_ID;

        } catch (error) {
            console.error('Error processing URL contractor ID:', error);
            return DEFAULT_CONTRACTOR_ID;
        }
    })();

    console.log('Using contractor ID:', urlContractorId);

    // Get the authenticated user's contractor ID for comparison only
    const {data: authenticatedContractor} = useQuery({
        queryKey: ['authenticated-contractor'],
        queryFn: async () => {
            const {data: {user}} = await supabase.auth.getUser();
            if (!user) return null;

            setAuthUserId(user.id);
            setIsAuthenticated(true);

            const {data: contractor} = await supabase
                .from('contractors')
                .select('id')
                .eq('user_id', user.id)
                .single();

            console.log('Authenticated contractor:', contractor);
            return contractor;
        },
    });

    // Always use the URL contractor ID for the estimate config
    const estimateConfig: EstimateConfig = {
        contractorId: urlContractorId,
        isPreview: false,
        allowSignature: true,
        showSubtotals: true
    };

    const {data: contractor, isLoading: isContractorLoading} = useQuery({
        queryKey: ["contractor", urlContractorId],
        queryFn: async () => {
            console.log('Fetching contractor settings for ID:', urlContractorId);
            const {data, error} = await supabase
                .from("contractors")
                .select("*, contractor_settings(*)")
                .eq("id", urlContractorId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching contractor:', error);
                throw error;
            }
            if (!data) {
                console.error('No contractor found with ID:', urlContractorId);
                throw new Error("Contractor not found");
            }
            return data;
        },
        enabled: isValidUUID(urlContractorId),
        retry: false
    });

    const {
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
        handleRefreshEstimate,
        changeProgress
    } = useEstimateFlow(estimateConfig);

    // Wrapped handleRefreshEstimate to manage loading state
    const handleRefreshEstimateWithLoading = async (leadId) => {
        if (!leadId) return;

        setIsRefreshingEstimate(true);
        try {
            await handleRefreshEstimate(leadId);
        } finally {
            setIsRefreshingEstimate(false);
        }
    };

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const {data: optionsData, error: optionsError} = await supabase
                    .from('Options')
                    .select('*')
                    .eq('Key Options', '42e64c9c-53b2-49bd-ad77-995ecb3106c6')
                    .single();

                if (optionsError) throw optionsError;

                const excludedCategoriesData = await supabase
                    .from('contractor_settings')
                    .select('excluded_categories')
                    .eq('id', urlContractorId)
                    .single()

                const excludedCategories = excludedCategoriesData.data?.excluded_categories || [];

                let transformedCategories: Category[] = Object.keys(optionsData)
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

                // Filter out excluded categories
                if (excludedCategories.length > 0) {
                    transformedCategories = transformedCategories.filter(cat => !excludedCategories.includes(cat.id));
                }

                console.log('excludedCategories', excludedCategories);

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

    useEffect(() => {
        console.log('Current lead ID in estimate:', currentLeadId);
    }, [currentLeadId]);

    // Show loading state if contractor data is loading
    if (isContractorLoading) {
        return (
            <div className="min-h-screen bg-gray-100">
                <div className="w-full h-8 bg-gray-200 animate-pulse"/>
                <div className="max-w-4xl mx-auto px-4 py-12">
                    {stage === 'estimate' ? <EstimateSkeleton/> : <MultiStepSkeleton/>}
                </div>
            </div>
        );
    }


    return (
        <>
            <GlobalBrandingLoader contractorId={urlContractorId}/>
            <div className="min-h-screen bg-secondary">
                <EstimateProgress stage={stage} progress={progress}/>

                {isAuthenticated && authenticatedContractor?.id === urlContractorId && (
                    <div className="w-full border-b border-gray-200">
                        <div className="max-w-4xl mx-auto px-4 py-2">
                            <button
                                onClick={() => navigate("/dashboard")}
                                className="text-muted-foreground hover:text-foreground flex items-center gap-2 p-2"
                            >
                                <ArrowLeft size={20}/>
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
                            onProgressChange={progress => changeProgress(progress)}
                            contractor={contractor || undefined}
                            contractorId={urlContractorId} // Pass contractorId
                            projectDescription={projectDescription} // Pass projectDescription
                            uploadedPhotos={uploadedPhotos} // Pass uploadedPhotos
                            uploadedImageUrl={uploadedImageUrl}
                        />
                    )}

                    <div className="relative">
                        {(stage === 'contact' || stage === 'estimate') && (
                            <div className={cn(
                                "transition-all duration-300",
                                stage === 'contact' ? "blur-sm" : "",
                                isRefreshingEstimate ? "pointer-events-none opacity-70" : ""
                            )}>
                                <EstimateDisplay
                                    groups={estimate?.groups || []}
                                    totalCost={estimate?.totalCost || 0}
                                    contractor={contractor || undefined}
                                    projectSummary={projectDescription}
                                    estimate={estimate}
                                    isLoading={isGeneratingEstimate}
                                    projectImages={uploadedPhotos}
                                    leadId={currentLeadId}
                                    contractorParam={contractorId}
                                    handleRefreshEstimate={handleRefreshEstimateWithLoading}
                                />
                            </div>
                        )}

                        {stage === 'contact' && (
                            <div
                                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
                                <div className="animate-fadeIn relative z-30 w-full max-w-lg">
                                    <ContactForm
                                        onSubmit={handleContactSubmit}
                                        leadId={currentLeadId || undefined}
                                        estimate={estimate}
                                        contractor={contractor}
                                        contractorId={urlContractorId}
                                        onSkip={async () => {
                                            if (currentLeadId) {
                                                await handleContactSubmit({}, true);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {isGeneratingEstimate && (
                            <div
                                className="fixed inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                                <div className="text-center">
                                    <EstimateAnimation className="w-24 h-24 mx-auto mb-4"/>
                                    <p className="text-lg font-medium text-primary">
                                        Generating your estimate...
                                    </p>
                                </div>
                            </div>
                        )}

                        {isRefreshingEstimate && (
                            <div
                                className="fixed inset-0 bg-background/30 backdrop-blur-[1px] z-20 flex items-center justify-center">
                                <div className="text-center bg-white p-6 rounded-lg shadow-lg">
                                    <EstimateAnimation className="w-16 h-16 mx-auto mb-4"/>
                                    <p className="text-lg font-medium text-primary">
                                        Refreshing your estimate...
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default EstimatePage;