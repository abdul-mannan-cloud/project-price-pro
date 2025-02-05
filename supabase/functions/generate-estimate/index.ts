import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QuestionAnswer {
  question: string;
  type: string;
  answers: string[];
  options: {
    label: string;
    value: string;
    next?: string;
  }[];
}

interface CategoryAnswers {
  [questionId: string]: QuestionAnswer;
}

interface AnswersState {
  [category: string]: CategoryAnswers;
}

interface RequestBody {
  answers: AnswersState;
  projectDescription?: string;
  category?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
    if (!llamaApiKey) {
      throw new Error('Missing LLAMA_API_KEY');
    }

    const { answers, projectDescription, category } = await req.json() as RequestBody;
    console.log('Generating estimate for:', { category, projectDescription });

    // Format answers into a more readable format for the AI
    const formattedAnswers = Object.entries(answers).map(([category, categoryAnswers]) => {
      const questions = Object.values(categoryAnswers).map(qa => ({
        question: qa.question,
        answer: qa.answers.map(ans => {
          const option = qa.options.find(opt => opt.value === ans);
          return option ? option.label : ans;
        }).join(', ')
      }));
      return { category, questions };
    });

    // Create the prompt for the AI
    const prompt = `Based on the following project details, generate a detailed construction estimate in JSON format.
    
Project Category: ${category || 'General Construction'}
${projectDescription ? `Project Description: ${projectDescription}` : ''}

Questions and Answers:
${formattedAnswers.map(cat => `
Category: ${cat.category}
${cat.questions.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n')}`).join('\n')}

Generate a detailed estimate with the following JSON structure:
{
  "groups": [
    {
      "name": "string",
      "items": [
        {
          "description": "string",
          "quantity": number,
          "unit": "string",
          "unitPrice": number,
          "total": number
        }
      ],
      "subtotal": number
    }
  ],
  "totalCost": number
}

Make sure to:
1. Break down costs into logical groups
2. Include labor and materials separately
3. Use realistic market prices
4. Include appropriate units (SF, EA, HR, etc.)
5. Calculate accurate subtotals and total cost`;

    console.log('Sending prompt to Llama:', prompt);

    const response = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{
          role: 'system',
          content: 'You are a construction cost estimator that generates detailed estimates in JSON format.'
        }, {
          role: 'user',
          content: prompt
        }],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error('Llama API error:', await response.text());
      throw new Error('Failed to generate estimate with Llama');
    }

    const aiResponse = await response.json();
    console.log('Raw AI response:', aiResponse);

    if (!aiResponse.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Llama API');
    }

    let estimateJson;
    try {
      estimateJson = JSON.parse(aiResponse.choices[0].message.content);
      console.log('Parsed estimate:', estimateJson);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Failed to parse estimate JSON from Llama API');
    }

    return new Response(
      JSON.stringify(estimateJson),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  } catch (error) {
    console.error('Error generating estimate:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate estimate',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  }
});