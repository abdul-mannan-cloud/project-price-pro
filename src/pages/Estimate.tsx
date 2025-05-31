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
    const {contractorId: urlContractorId} = useParams();
    const [isSpeechSupported, setIsSpeechSupported] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [authUserId, setAuthUserId] = useState<string | null>(null);
    const [isRefreshingEstimate, setIsRefreshingEstimate] = useState(false);
    const {updateContractorId} = useContractor();

    // Extract and validate contractor ID from URL
    const getContractorIdFromUrl = (): string => {
        // If no contractor ID in URL or it's a placeholder, use default
        if (!urlContractorId || 
            urlContractorId === ":contractorId?" || 
            urlContractorId === "undefined" || 
            urlContractorId === "null") {
            console.log('No valid contractor ID in URL, using default:', DEFAULT_CONTRACTOR_ID);
            return DEFAULT_CONTRACTOR_ID;
        }

        // Validate UUID format
        if (!isValidUUID(urlContractorId)) {
            console.log('Invalid UUID format in URL, using default:', DEFAULT_CONTRACTOR_ID);
            return DEFAULT_CONTRACTOR_ID;
        }

        console.log('Valid contractor ID from URL:', urlContractorId);
        return urlContractorId;
    };

    const finalContractorId = getContractorIdFromUrl();

    useEffect(() => {
        updateContractorId(finalContractorId);
    }, [finalContractorId, updateContractorId]);

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

    // Fetch contractor data from Supabase using the extracted ID
    const {data: contractor, isLoading: isContractorLoading, error: contractorError} = useQuery({
        queryKey: ["contractor", finalContractorId],
        queryFn: async () => {
            console.log('Fetching contractor settings for ID:', finalContractorId);
            
            const {data, error} = await supabase
                .from("contractors")
                .select("*, contractor_settings(*)")
                .eq("user_id", finalContractorId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching contractor:', error);
                throw new Error(`Failed to fetch contractor: ${error.message}`);
            }
            
            if (!data) {
                console.error('No contractor found with User ID:', finalContractorId);
                throw new Error(`No contractor found with User ID: ${finalContractorId}`);
            }
            
            console.log('Successfully fetched contractor:', data);
            return data;
        },
        enabled: isValidUUID(finalContractorId),
        retry: (failureCount, error) => {
            // Don't retry if contractor doesn't exist
            if (error?.message?.includes('No contractor found')) {
                return false;
            }
            // Retry up to 2 times for other errors
            return failureCount < 2;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Always use the final contractor ID for the estimate config
    const estimateConfig: EstimateConfig = {
        contractorId: contractor?.id,
        isPreview: false,
        allowSignature: true,
        showSubtotals: true
    };

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
        changeProgress,
        handleContractSign
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
                    .eq('id', contractor?.id)
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
    }, [contractor?.id, setCategories, setIsLoading]);

    useEffect(() => {
        const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        setIsSpeechSupported(isSupported);
    }, []);

    // Handle contractor loading states and errors
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

    if (contractorError || !contractor) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Contractor Not Found</h2>
                    <p className="text-gray-600 mb-6">
                        The contractor with ID "{finalContractorId}" could not be found.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <GlobalBrandingLoader contractorId={contractor?.id}/>
            <div className="min-h-screen bg-secondary">
                <div className="sticky top-0 z-[10000] w-full bg-white border-b border-gray-200 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-4">
                            {/* Logo and Business Name */}
                            <div className="flex items-center space-x-3">
                                {contractor?.business_logo_url && <div
                                    className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden border border-gray-100 shadow-sm">
                                    <img
                                        src={contractor?.business_logo_url}
                                        className="w-full h-full object-cover"
                                        alt={`${contractor?.business_name} logo`}
                                    />
                                </div>}
                                <div>
                                    <h1 className="text-lg md:text-xl font-bold text-gray-900">{contractor?.business_name}</h1>
                                    <p className="text-xs text-gray-500 hidden sm:block">Professional Contractor</p>
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div className="hidden md:flex items-center space-x-8">
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Phone</p>
                                        <p className="text-sm font-medium">{contractor?.contact_phone}</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Email</p>
                                        <p className="text-sm font-medium">{contractor?.contact_email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Contact Information */}
                            <div className="md:hidden flex space-x-2">
                                <a href={`tel:${contractor?.contact_phone}`} className="p-2 rounded-full bg-primary text-white flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                    </svg>
                                </a>
                                <a href={`mailto:${contractor?.contact_email}`} className="p-2 rounded-full bg-primary-100 text-primary flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                
                <EstimateProgress stage={stage} progress={progress}/>

                {isAuthenticated && authenticatedContractor?.id === contractor?.id && (
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
                            contractorId={contractor?.id}
                            projectDescription={projectDescription}
                            uploadedPhotos={uploadedPhotos}
                            uploadedImageUrl={uploadedImageUrl}
                            currentStageName={stage}
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
                                    contractorParam={urlContractorId}
                                    handleRefreshEstimate={handleRefreshEstimateWithLoading}
                                    handleContractSign={handleContractSign}
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
                                        contractorId={contractor?.id}
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