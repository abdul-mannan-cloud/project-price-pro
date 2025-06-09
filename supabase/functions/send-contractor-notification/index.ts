import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

// Strong typing for all data structures
interface CustomerInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  available_date?: string;
  available_time?: string;
  flexible?: 'flexible' | 'on_date' | 'before_date';
}

interface Question {
  id: string;
  question: string;
}

interface CategoryData {
  category: string;
  questions: Question[];
}

interface AnswerData {
  answers: string | string[];
}

interface CategoryAnswers {
  [questionId: string]: AnswerData;
}

interface Answers {
  [category: string]: CategoryAnswers;
}

interface Contractor {
  contact_email: string;
  [key: string]: any;
}

interface Estimate {
  totalCost: number;
  [key: string]: any;
}

interface ContractorNotificationRequest {
  customerInfo: CustomerInfo;
  estimate: Estimate;
  contractor: Contractor;
  questions: CategoryData[];
  answers: Answers;
  isTestEstimate?: boolean;
  leadId: string; // <-- Added this line
}


// Environment variables handling
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
if (!RESEND_API_KEY) {
  console.error("RESEND_API_KEY environment variable is not set");
  Deno.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

// CORS headers as a constant
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

/**
 * Formats customer questions and answers into HTML
 * @param questions - Array of question categories
 * @param answers - Object containing all answers
 * @returns Formatted HTML string
 */
function formatQuestionsAndAnswers(questions: CategoryData[], answers: Answers): string {
  let html = '<div style="margin: 20px 0;">';
  html += '<h3 style="color: #333;">Customer Responses:</h3>';
  html += '<ul style="list-style-type: none; padding: 0;">';

  // Check if we have questions and answers
  if (!questions?.length || !answers) {
    html += '<li style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 4px;">No responses available</li>';
    html += '</ul></div>';
    return html;
  }

  // For each category in the questions
  questions.forEach(categoryData => {
    const { category, questions: categoryQuestions } = categoryData;
    const categoryAnswers = answers[category];

    if (categoryAnswers) {
      // Add category header if there are multiple categories
      if (questions.length > 1) {
        html += `<li style="margin: 15px 0 5px; font-weight: bold; color: #333;">${category}:</li>`;
      }

      // Process each answered question in this category
      Object.entries(categoryAnswers).forEach(([questionId, answerData]) => {
        // Find the corresponding question text
        const questionObj = categoryQuestions.find(q => q.id === questionId);
        if (questionObj && answerData.answers) {
          const questionText = questionObj.question;
          const answerValues = answerData.answers;

          html += `
            <li style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 4px;">
              <strong style="color: #444;">Q: ${questionText}</strong><br>
              <span style="color: #666;">A: ${Array.isArray(answerValues) ? answerValues.join(', ') : answerValues}</span>
            </li>
          `;
        }
      });
    }
  });

  html += '</ul></div>';
  return html;
}

/**
 * Formats a number as USD currency
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Generates email HTML content
 * @param params - Parameters for email content
 * @returns HTML string
 */
function generateEmailContent(params: {
  subject: string;
  customerInfo: CustomerInfo;
  customerDetails: string;
  customerAvailability: string;
  questions: CategoryData[];
  answers: Answers;
  estimate: Estimate;
  isTestEstimate: boolean;
  leadId: string; // <-- Added this line
}): string {
  const {
    subject,
    customerDetails,
    customerAvailability,
    questions,
    answers,
    estimate,
    isTestEstimate,
    leadId // <-- Destructured this
  } = params;

  const viewLink = `https://estimatrix.io/leads?leadId=${leadId}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">${subject}</h2>
      
      <div style="margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
        <h3 style="color: #444;">Details:</h3>
        ${customerDetails}
      </div>
      
      <div style="margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
        <h3 style="color: #444;">Availability:</h3>
        ${customerAvailability}
      </div>

      ${formatQuestionsAndAnswers(questions, answers)}

      <div style="margin: 20px 0;">
        <h3 style="color: #333;">Estimate Details:</h3>
        <p><strong>Total Estimated Cost:</strong> ${formatCurrency(estimate.totalCost || 0)}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${viewLink}" target="_blank" style="background-color: #1a73e8; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Opportunity</a>
      </div>

      <p style="color: #666; font-size: 14px;">
        ${isTestEstimate
          ? 'This is a test estimate preview. No customer information is attached.'
          : 'This is an automated notification. Please log in to your dashboard to view the full estimate details and take action.'}
      </p>
    </body>
    </html>
  `;
}


/**
 * Formats customer availability information
 * @param customerInfo - Customer information
 * @returns HTML string with availability details
 */

function formatAvailability(customerInfo: CustomerInfo): string {
  let availableDate = '';

  if (customerInfo.available_date == null && customerInfo.available_time == null) {
    return `
      <ul style="list-style-type: none; padding: 0;">
        ${`<li><strong>Date Available:</strong>N/A</li>`}
        ${`<li><strong>Time Available:</strong>N/A</li>`}
      </ul>
    `;
  }

  if (customerInfo.flexible === 'flexible') {
    availableDate = 'Flexible Date';
  } else if (customerInfo.flexible === 'on_date') {
    availableDate = `On Date ${customerInfo.available_date}`;
  } else if (customerInfo.available_date) {
    availableDate = `Before Date ${customerInfo.available_date}`;
  }


  return `
    <ul style="list-style-type: none; padding: 0;">
      ${customerInfo.available_date ? `<li><strong>Date Available:</strong> ${availableDate}</li>` : ''}
      ${customerInfo.available_time ? `<li><strong>Time Available:</strong> ${customerInfo.available_time}</li>` : ''}
    </ul>
  `;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const requestData: ContractorNotificationRequest = await req.json();
    const {
      customerInfo,
      estimate,
      contractor,
      questions,
      answers,
      isTestEstimate = false,
      leadId
    } = requestData;

    if (!contractor?.contact_email) {
      throw new Error("Contractor email not provided");
    }

    const subject = isTestEstimate
      ? `[TEST] New Estimate Preview Generated`
      : `New $${estimate.totalCost.toLocaleString()} Opportunity from ${customerInfo.fullName}`;


    const customerDetails = isTestEstimate
        ? `<p style="color: #666;"><strong>Note:</strong> This is a test estimate preview.</p>`
        : `
        <ul style="list-style-type: none; padding: 0;">
          <li><strong>Name:</strong> ${customerInfo.fullName}</li>
          <li><strong>Email:</strong> ${customerInfo.email}</li>
           <li><strong>Phone:</strong> <a href="tel:${customerInfo.phone}" style="color: #1a73e8; text-decoration: none;">${customerInfo.phone}</a></li>
          <li><strong>Address:</strong> ${customerInfo.address}</li>
        </ul>
      `;

    const customerAvailability = formatAvailability(customerInfo);

    const emailContent = generateEmailContent({
      subject,
      customerInfo,
      customerDetails,
      customerAvailability,
      questions,
      answers,
      estimate,
      isTestEstimate,
      leadId // <-- pass it here
    });

    const emailResponse = await resend.emails.send({
      from: "Estimatrix <Opportunity@estimatrix.io>",
      to: [contractor.contact_email],
      subject: subject,
      html: emailContent,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (error) {
    console.error("Error in send-contractor-notification function:", error);
    return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
        {
          status: 500,
          headers: CORS_HEADERS,
        }
    );
  }
});