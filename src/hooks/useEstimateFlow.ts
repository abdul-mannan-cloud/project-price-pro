import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Category, CategoryQuestions, AnswersState, EstimateConfig } from "@/types/estimate";
import { findMatchingQuestionSets, consolidateQuestionSets } from "@/utils/questionSetMatcher";
import { Database, Json } from "@/integrations/supabase/types";
import html2pdf from 'html2pdf.js';

type LeadInsert = Database['public']['Tables']['leads']['Insert'];
type ContactData = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  available_date?: string;
  available_time?: string;
  flexible?: boolean;
};

interface Lead {
  estimate_data: Record<string, any> | null;
  status: 'pending' | 'complete' | 'error' | string;
  error_message: string | null;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  project_address: string | null;
  available_date: string | null;
  available_time: string | null;
  flexible: boolean | null;
}

export type EstimateStage = 'photo' | 'description' | 'questions' | 'contact' | 'estimate' | 'category';

export const useEstimateFlow = (config: EstimateConfig) => {
  const [stage, setStage] = useState<EstimateStage>('photo');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [projectDescription, setProjectDescription] = useState<string>("");
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [completedCategories, setCompletedCategories] = useState<string[]>([]);
  const [matchedQuestionSets, setMatchedQuestionSets] = useState<CategoryQuestions[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [estimate, setEstimate] = useState<Record<string, any> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGeneratingEstimate, setIsGeneratingEstimate] = useState<boolean>(false);
  const [answers, setAnswers] = useState<AnswersState>({});
  const { toast } = useToast();

  const handlePhotoUpload = (urls: string[]): void => {
    setUploadedPhotos(urls);
    if (urls.length > 0) {
      setUploadedImageUrl(urls[0]);
    }
    setStage('description');
  };

  const changeProgress = (newProgress: number): void => {
    setProgress(newProgress);
  };

  const handleDescriptionSubmit = async (description: string): Promise<void> => {
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

  const handleRefreshEstimate = async (leadId: string): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('Refreshing estimate with ID:', leadId);

      if (!leadId) {
        throw new Error('Missing lead ID');
      }

      const { data: addressData, error: addressError } = await supabase
          .from('contractors')
          .select('business_address')
          .eq('id', config.contractorId)
          .single();

      if (addressError) {
        throw addressError;
      }

      let address_string = "";
      if (!addressData || !addressData.business_address) {
        try {
          const response = await fetch('https://ipapi.co/json/?key=AzZ4jUj0F5eFNjhgWgLpikGJxYdf5IzcsfBQSiOMw69RtR8JzX');

          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }

          const ipAddressData = await response.json();
          address_string = `${ipAddressData.city}, ${ipAddressData.region}, ${ipAddressData.country_name}`;
        } catch (error) {
          console.error('Error fetching IP address data:', error);
          throw error;
        }
      } else {
        address_string = addressData.business_address;
      }

      toast({
        title: "Estimate refresh started",
        description: "Your estimate will be updated shortly.",
      });

      const { error: generateError } = await supabase.functions.invoke('generate-estimate', {
        body: {
          leadId,
          contractorId: config.contractorId,
          projectDescription,
          category: matchedQuestionSets[0]?.category,
          imageUrl: uploadedImageUrl,
          projectImages: uploadedPhotos,
          answers,
          address: address_string
        }
      });

      if (generateError) throw generateError;

      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = setInterval(async () => {
        try {
          const isComplete = await checkEstimateStatus(leadId, false);
          attempts++;

          if (isComplete || attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setIsLoading(false);

            if (!isComplete && attempts >= maxAttempts) {
              toast({
                title: "Timeout",
                description: "Estimate generation is taking longer than expected. Please check back later.",
                variant: "destructive",
              });
            }
          }
        } catch (pollError) {
          console.error('Error polling estimate:', pollError);
          clearInterval(pollInterval);
          setIsLoading(false);

          toast({
            title: "Error",
            description: "Failed to check estimate status. Please try again.",
            variant: "destructive",
          });
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

  const handleCategorySelect = (categoryIds: string[]): void => {
    if (categoryIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one category",
        variant: "destructive",
      });
      return;
    }

    setSelectedCategory(categoryIds[0]);

    const questionSets: CategoryQuestions[] = categoryIds.map(categoryId => {
      const selectedCategoryData = categories.find(cat => cat.id === categoryId);

      if (!selectedCategoryData) {
        return {
          category: categoryId,
          questions: [],
          confidence: 1,
          keywords: []
        };
      }

      return {
        category: categoryId,
        questions: selectedCategoryData.questions || [],
        confidence: 1,
        keywords: selectedCategoryData.keywords || []
      };
    }).filter(set => set.questions.length > 0);

    setMatchedQuestionSets(questionSets);
    setStage('questions');
  };

  const handleExportPDF = async (companyName: string): Promise<string> => {
    const element = document.getElementById('estimate-content');
    if (!element) throw new Error('No estimate content found');

    // Hide action buttons during export
    const actionButtons = document.getElementById('estimate-actions');
    if (actionButtons) {
      actionButtons.style.display = 'none';
    }

    // Create a loading toast
    toast({
      title: "Generating PDF",
      description: "Please wait while your PDF is being created...",
    });

    try {
      // Improved options for better image rendering and page formatting
      const opt = {
        margin: [15, 15, 20, 15],
        filename: `${companyName}-estimate.pdf`,
        image: {
          type: 'jpeg',
          quality: 1.0
        },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          allowTaint: true,
          imageTimeout: 0,
          backgroundColor: '#ffffff'
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true,
          putOnlyUsedFonts: true
        },
        pagebreak: { mode: 'avoid-all' }
      };

      // Wait for all images to load
      const images = element.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      // Generate PDF and get as base64
      const pdf = await html2pdf()
          .set(opt)
          .from(element)
          .outputPdf('datauristring');

      // Restore UI elements
      if (actionButtons) {
        actionButtons.style.display = 'flex';
      }

      // // Success notification
      // toast({
      //   title: "PDF generated successfully",
      //   description: "Your estimate has been saved as a PDF file",
      // });

      return pdf;
    } catch (error) {
      console.error("PDF generation error:", error);
      // Restore UI elements
      if (actionButtons) {
        actionButtons.style.display = 'flex';
      }
      // Error notification
      toast({
        title: "Error",
        description: "Failed to export PDF. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleGenerateInvoice = async (contractor, totalCost) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: {
          customerId: contractor?.stripe_customer_id,
          description: 'New lead service fee',
          items: [
            { amount: Math.round((totalCost * 100) * 0.01 + 10 ), description: 'Service charges' },
          ],
          metadata: {
            plan: 'standard',
            source: 'website',
            userId: contractor.id 
          }
        }
      });
      
      if (error) {
        throw new Error(error.message || "Failed to generate invoice");
      }
      
      console.log('Invoice generated successfully:', data);
      return data;
      
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    }
  };

  const handleUsageInvoice = async (contractor, totalCost) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: {
          customerId: contractor?.stripe_customer_id,
          description: 'New lead service fee',
          items: [
            { amount: Math.round((totalCost * 100)), description: 'Service charges' },
          ],
          metadata: {
            plan: 'standard',
            source: 'website',
            userId: contractor.id 
          }
        }
      });
      
      if (error) {
        throw new Error(error.message || "Failed to generate invoice");
        return false;
      }
      
      console.log('Invoice generated successfully:', data);
      return true;
      
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    }
  };

  const checkEstimateStatus = async (leadId: string, skip: boolean = false, pdfBase64?: string): Promise<boolean> => {
    const { data: lead, error } = await supabase
        .from('leads')
        .select('estimate_data, status, error_message, user_name, user_email, user_phone, project_address, available_date, available_time, flexible')
        .eq('id', leadId)
        .maybeSingle() as { data: Lead, error: Error };

    if (error) {
      throw error;
    }

    if (!lead) return false;

    if (lead.status === 'error') {
      throw new Error(lead.error_message || 'Failed to generate estimate');
    }

    if (lead.status === 'complete' && lead.estimate_data) {
      setEstimate(lead.estimate_data);

      console.log("THIS IS THE LEAD DATA", lead);

      const { data: emailData, error: emailFetchError } = await supabase
          .from('contractors')
          .select('*')
          .eq('id', config.contractorId)
          .single();

      if (emailFetchError) {
        throw emailFetchError;
      }

      if (emailData.tier === 'pioneer') {
        console.log("HERE IS THE ESTIMATE DATA", lead.estimate_data);

        const totalFee = lead.estimate_data.totalCost;
        const availableCredits = emailData.cash_credits;
        let remainingFee = totalFee;

        if (availableCredits > 0) {
          const creditsToUse = Math.min(availableCredits, totalFee);
          remainingFee = totalFee - creditsToUse;

          const { error } = await supabase
            .from('contractors')
            .update({ cash_credits: availableCredits - creditsToUse })
            .eq('id', config.contractorId);

          if (error) {
            console.error('Failed to update cash credits:', error.message);
            return;
          }
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        
        if (authError) {
          console.error('Error checking authentication:', authError);
        }
        
        if (user && user !== null) {
          console.log('User logged in, skipping invoice generation');

          // Step 1: Fetch current usage
          const { data: currentData, error: fetchError } = await supabase
            .from('contractors')
            .select('usage')
            .eq('id', emailData?.id)
            .single();

          if (fetchError) {
            console.error('Error fetching current usage:', fetchError);
            return;
          }

          const currentUsage = currentData?.usage || 0;
          const additionalUsage = ((lead.estimate_data.tokenUsage.totalTokens / 1000) * 2 * 0.01) + 0.10;
          const newUsage = currentUsage + additionalUsage;

          if (newUsage > 5) {
            const result = handleUsageInvoice(emailData, newUsage);
            if (result) {
              const { data: usageData, error: updateError } = await supabase
              .from('contractors')
              .update({ usage: 0.00 })
              .eq('id', emailData?.id);  
            } else {
              const { data: usageData, error: updateError } = await supabase
              .from('contractors')
              .update({ usage: newUsage })
              .eq('id', emailData?.id);
            }
          } else {
            // Step 2: Update usage
            const { data: usageData, error: updateError } = await supabase
              .from('contractors')
              .update({ usage: newUsage })
              .eq('id', emailData?.id);

            if (updateError) {
              console.error('Error updating usage:', updateError);
            }
          }
        }

        if (remainingFee > 0 && !user) {
          handleGenerateInvoice(emailData, remainingFee);
        }
      }

      const { error: emailError1 } = await supabase.functions.invoke('send-contractor-notification', {
        body: {
          estimate: {
            totalCost: lead.estimate_data.totalCost,
          },
          contractor: {
            contact_email: emailData?.contact_email,
          },
          questions: matchedQuestionSets,
          answers,
          isTestEstimate: skip,
          customerInfo: {
            fullName: lead.user_name,
            email: lead.user_email,
            phone: lead.user_phone,
            address: lead.project_address,
            available_date: lead.available_date,
            available_time: lead.available_time,
            flexibility: lead.flexible
          }
        }
      });

      if (emailError1) {
        console.error("Failed to send contractor email", emailError1);
      }

      // Send SMS to contractor
      // if (emailData?.contact_phone && !skip) {
      //   try {
      //     const { error: smsSendError } = await supabase.functions.invoke('send-sms', {
      //       body: {
      //         phone: emailData.contact_phone,
      //         message: `New estimate opportunity! ${lead.user_name} is requesting an estimate for ${formatCurrency(lead.estimate_data.totalCost)}. Check your email for details.`,
      //         recipientType: 'contractor'
      //       }
      //     });
          
      //     if (smsSendError) {
      //       console.error("Failed to send contractor SMS", smsSendError);
      //     }
      //   } catch (smsError) {
      //     console.error("Error sending contractor SMS:", smsError);
      //   }
      // }

      // Generate PDF if not provided
      const pdfToSend = pdfBase64 || await handleExportPDF(emailData.business_name || "Estimate");

      // Send email to customer
      const { error: emailError } = await supabase.functions.invoke('send-estimate-email', {
        body: {
          estimateId: leadId,
          contractorEmail: emailData.contact_email || "abdulmannankhan1000@gmail.com",
          contractorName: emailData.business_name || "Contractor",
          contractorPhone: emailData.contact_phone || "N/A",
          customerEmail: lead.user_email,
          customerName: lead.user_name,
          estimateData: lead.estimate_data,
          estimateUrl: window.location.origin + `/e/${leadId}`,
          pdfBase64: pdfToSend,
          businessName: emailData?.business_name || "Your Contractor",
          isTestEstimate: skip
        }
      });

      if (emailError) {
        console.log("Error sending customer email");
        throw emailError;
      }

      // Send SMS to customer
      // if (lead.user_phone && !skip) {
      //   try {
      //     const { error: smsSendError } = await supabase.functions.invoke('send-sms', {
      //       body: {
      //         phone: lead.user_phone,
      //         message: `Your estimate from ${emailData.business_name || "Your Contractor"} is ready! Total: ${formatCurrency(lead.estimate_data.totalCost)}. Check your email for details or view online: ${window.location.origin}/e/${leadId}`,
      //         recipientType: 'customer'
      //       }
      //     });
          
      //     if (smsSendError) {
      //       console.error("Failed to send customer SMS", smsSendError);
      //     }
      //   } catch (smsError) {
      //     console.error("Error sending customer SMS:", smsError);
      //   }
      // }

      setIsGeneratingEstimate(false);
      setStage('estimate');
      return true;
    }

    return false;
  };

  // Helper function to format currency
  // const formatCurrency = (amount: number): string => {
  //   return new Intl.NumberFormat('en-US', {
  //     style: 'currency',
  //     currency: 'USD',
  //   }).format(amount);
  // };

  const formatAnswersForJson = (answers: AnswersState): Json => {
    const formattedAnswers = Object.entries(answers).reduce<Record<string, Record<string, unknown>>>((acc, [category, categoryAnswers]) => {
      acc[category] = Object.entries(categoryAnswers || {}).reduce<Record<string, unknown>>((catAcc, [questionId, answer]) => {
        catAcc[questionId] = {
          question: answer.question,
          type: answer.type,
          answers: answer.answers,
          options: answer.options
        };
        return catAcc;
      }, {});
      return acc;
    }, {});

    return formattedAnswers as Json;
  };

  const handleQuestionComplete = async (answers: AnswersState, leadId: string): Promise<void> => {
    if (!config.contractorId) {
      console.error('Missing contractor ID in config:', config);
      toast({
        title: "Error",
        description: "Contractor ID is required",
        variant: "destructive",
      });
      return;
    }

    setAnswers(answers);
    setCurrentLeadId(leadId);
    setStage('contact');
  };

  const handleContactSubmit = async (contactData: ContactData, skip: boolean = false): Promise<void> => {
    try {
      if (!currentLeadId) {
        throw new Error('No lead ID available');
      }

      const isComplete = await checkEstimateStatus(currentLeadId, skip);
      setIsGeneratingEstimate(false);

    } catch (error) {
      console.error('Error saving contact information:', error);
      setIsGeneratingEstimate(false);
      toast({
        title: "Error",
        description: "Failed to save your contact information. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContractSign = async (leadId: string): Promise<void> => {
    try {
      if (!currentLeadId) {
        throw new Error('No lead ID available');
      }

      // Get the current date in a readable format
      const signatureDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Fetch lead data
      const { data: lead, error: leadError } = await supabase
          .from('leads')
          .select('estimate_data, user_name, user_email, user_phone, project_address')
          .eq('id', leadId)
          .single();

      if (leadError) throw leadError;
      if (!lead) throw new Error('Lead not found');

      // Fetch contractor data
      const { data: contractor, error: contractorError } = await supabase
          .from('contractors')
          .select('business_name, contact_email, contact_phone')
          .eq('id', config.contractorId)
          .single();

      if (contractorError) throw contractorError;
      if (!contractor) throw new Error('Contractor not found');

      // Generate PDF (if needed)
      const pdfBase64 = await handleExportPDF(contractor.business_name || "Estimate");

      // Prepare the request data
      const requestData = {
        estimateId: leadId,
        estimateUrl: `${window.location.origin}/e/${leadId}`,
        estimateData: lead.estimate_data,
        customerInfo: {
          fullName: lead.user_name || '',
          email: lead.user_email || '',
          phone: lead.user_phone || '',
          address: lead.project_address || ''
        },
        contractorInfo: {
          name:contractor.business_name || '',
          businessName: contractor.business_name || '',
          email: contractor.contact_email || '',
          phone: contractor.contact_phone || ''
        },
        signatureDate,
        pdfBase64
      };

      // Call the Supabase function
      const { error } = await supabase.functions.invoke('send-signature-email', {
        body: requestData
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contract signed and notifications sent successfully!",
      });

    } catch (error) {
      console.error('Error signing contract:', error);
      toast({
        title: "Error",
        description: "Failed to sign contract. Please try again.",
        variant: "destructive",
      });
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
    handleRefreshEstimate,
    changeProgress,
    handleExportPDF,
    handleContractSign,
    handleGenerateInvoice
  };
};