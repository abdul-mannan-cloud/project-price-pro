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
      "description": "string",
      "subgroups": [
        {
          "name": "string",
          "items": [
            {
              "title": "string",
              "description": "string",
              "quantity": number,
              "unit": "string",
              "unitAmount": number,
              "totalPrice": number
            }
          ],
          "subtotal": number
        }
      ]
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
      console.error('Llama API error response:', await response.text());
      throw new Error(`Llama API error: ${response.status} ${response.statusText}`);
    }

    const aiResponse = await response.json();
    console.log('Raw AI response:', aiResponse);

    if (!aiResponse.choices?.[0]?.message?.content) {
      console.error('Invalid response format from Llama API:', aiResponse);
      throw new Error('Invalid response format from Llama API');
    }

    let estimateJson;
    try {
      const content = aiResponse.choices[0].message.content.trim();
      console.log('Parsing content:', content);
      
      // Validate that the content starts with { and ends with }
      if (!content.startsWith('{') || !content.endsWith('}')) {
        throw new Error('Invalid JSON format: content must be a JSON object');
      }
      
      estimateJson = JSON.parse(content);
      console.log('Parsed estimate:', estimateJson);

      // Validate the structure
      if (!estimateJson.groups || !Array.isArray(estimateJson.groups)) {
        throw new Error('Invalid estimate structure: missing or invalid groups array');
      }

      if (typeof estimateJson.totalCost !== 'number') {
        throw new Error('Invalid estimate structure: missing or invalid totalCost');
      }

      // Validate each group and subgroup
      estimateJson.groups.forEach((group: any, groupIndex: number) => {
        if (!group.name || typeof group.name !== 'string') {
          throw new Error(`Invalid group name at index ${groupIndex}`);
        }
        
        if (!group.subgroups || !Array.isArray(group.subgroups)) {
          throw new Error(`Invalid subgroups array in group ${group.name}`);
        }

        group.subgroups.forEach((subgroup: any, subgroupIndex: number) => {
          if (!subgroup.name || typeof subgroup.name !== 'string') {
            throw new Error(`Invalid subgroup name in group ${group.name} at index ${subgroupIndex}`);
          }

          if (!subgroup.items || !Array.isArray(subgroup.items)) {
            throw new Error(`Invalid items array in subgroup ${subgroup.name}`);
          }

          if (typeof subgroup.subtotal !== 'number') {
            throw new Error(`Invalid subtotal in subgroup ${subgroup.name}`);
          }

          subgroup.items.forEach((item: any, itemIndex: number) => {
            if (!item.title || typeof item.title !== 'string') {
              throw new Error(`Invalid item title in subgroup ${subgroup.name} at index ${itemIndex}`);
            }
            if (typeof item.quantity !== 'number') {
              throw new Error(`Invalid quantity in item ${item.title}`);
            }
            if (typeof item.unitAmount !== 'number') {
              throw new Error(`Invalid unitAmount in item ${item.title}`);
            }
            if (typeof item.totalPrice !== 'number') {
              throw new Error(`Invalid totalPrice in item ${item.title}`);
            }
          });
        });
      });

    } catch (parseError) {
      console.error('JSON parse or validation error:', parseError);
      throw new Error(`Failed to parse or validate estimate JSON: ${parseError.message}`);
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