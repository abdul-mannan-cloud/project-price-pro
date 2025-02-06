
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
    if (!llamaApiKey) {
      throw new Error('Missing LLAMA_API_KEY');
    }

    let requestData;
    try {
      requestData = await req.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      throw new Error('Invalid request body');
    }

    const { answers, projectDescription, category } = requestData;
    console.log('Generating estimate for:', { category, projectDescription });

    const formattedAnswers = Object.entries(answers || {}).map(([category, categoryAnswers]) => {
      const questions = Object.entries(categoryAnswers || {}).map(([_, qa]) => ({
        question: qa.question,
        answer: qa.answers.map(ans => {
          const option = qa.options.find(opt => opt.value === ans);
          return option ? option.label : ans;
        }).join(', ')
      }));
      return { category, questions };
    });

    // Generate AI title and message
    const titlePrompt = `Based on this project description and answers, generate a concise project title (4 words or less):
    Category: ${category || 'General Construction'}
    Description: ${projectDescription || 'Project estimate'}
    ${formattedAnswers.map(cat => 
      cat.questions.map(q => `${q.question}: ${q.answer}`).join('\n')
    ).join('\n')}`;

    const messagePrompt = `Based on this project description and answers, generate a clear, professional overview of the project scope (2-3 sentences):
    Category: ${category || 'General Construction'}
    Description: ${projectDescription || 'Project estimate'}
    ${formattedAnswers.map(cat => 
      cat.questions.map(q => `${q.question}: ${q.answer}`).join('\n')
    ).join('\n')}`;

    console.log('Sending title prompt:', titlePrompt);
    console.log('Sending message prompt:', messagePrompt);

    const [titleResponse, messageResponse] = await Promise.all([
      fetch('https://api.llama-api.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llamaApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            role: 'system',
            content: 'Generate a concise project title.'
          }, {
            role: 'user',
            content: titlePrompt
          }],
          temperature: 0.2,
          response_format: { type: "text" }
        }),
      }),
      fetch('https://api.llama-api.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llamaApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            role: 'system',
            content: 'Generate a clear project overview.'
          }, {
            role: 'user',
            content: messagePrompt
          }],
          temperature: 0.2,
          response_format: { type: "text" }
        }),
      })
    ]);

    if (!titleResponse.ok) {
      console.error('Title API error:', await titleResponse.text());
      throw new Error(`Title API error: ${titleResponse.status}`);
    }

    if (!messageResponse.ok) {
      console.error('Message API error:', await messageResponse.text());
      throw new Error(`Message API error: ${messageResponse.status}`);
    }

    const [titleData, messageData] = await Promise.all([
      titleResponse.json(),
      messageResponse.json()
    ]);

    console.log('Title API response:', titleData);
    console.log('Message API response:', messageData);

    const aiTitle = titleData.choices?.[0]?.message?.content?.trim() || 'Project Estimate';
    const aiMessage = messageData.choices?.[0]?.message?.content?.trim() || 'Custom project estimate based on provided specifications.';

    const prompt = `Based on the following project details, generate a detailed construction estimate in JSON format.
    
Project Category: ${category || 'General Construction'}
Project Description: ${projectDescription || 'Project estimate'}

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
  "totalCost": number,
  "ai_generated_title": string,
  "ai_generated_message": string
}

Important:
1. Return ONLY valid JSON, no additional text
2. Ensure all numbers are valid and calculations are accurate
3. Include realistic market prices
4. Break down costs into logical groups
5. Include both labor and materials`;

    console.log('Sending estimate prompt to Llama API');

    const response = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{
          role: 'system',
          content: 'You are a construction cost estimator. Generate detailed estimates in JSON format only.'
        }, {
          role: 'user',
          content: prompt
        }],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Llama API estimate error:', errorText);
      throw new Error(`Llama API error: ${response.status} ${response.statusText}`);
    }

    const aiResponse = await response.json();
    console.log('Received estimate response:', aiResponse);

    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Invalid estimate response format');
    }

    console.log('Parsing estimate content:', content);

    let parsedEstimate;
    try {
      // If content is already an object, use it directly
      parsedEstimate = typeof content === 'string' ? JSON.parse(content) : content;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error(`Failed to parse JSON: ${parseError.message}`);
    }

    if (!parsedEstimate || typeof parsedEstimate !== 'object') {
      throw new Error('Invalid estimate format: must be an object');
    }

    if (!Array.isArray(parsedEstimate.groups)) {
      throw new Error('Invalid estimate structure: groups must be an array');
    }

    if (typeof parsedEstimate.totalCost !== 'number') {
      throw new Error('Invalid estimate structure: totalCost must be a number');
    }

    // Add the AI generated title and message
    parsedEstimate.ai_generated_title = aiTitle;
    parsedEstimate.ai_generated_message = aiMessage;

    // Validate structure and types
    parsedEstimate.groups.forEach((group, groupIndex) => {
      if (!group.name || typeof group.name !== 'string') {
        throw new Error(`Invalid group name at index ${groupIndex}`);
      }

      if (!Array.isArray(group.subgroups)) {
        throw new Error(`Invalid subgroups array in group ${group.name}`);
      }

      group.subgroups.forEach((subgroup, subgroupIndex) => {
        if (!subgroup.name || typeof subgroup.name !== 'string') {
          throw new Error(`Invalid subgroup name in group ${group.name}`);
        }

        if (!Array.isArray(subgroup.items)) {
          throw new Error(`Invalid items array in subgroup ${subgroup.name}`);
        }

        if (typeof subgroup.subtotal !== 'number') {
          throw new Error(`Invalid subtotal in subgroup ${subgroup.name}`);
        }

        subgroup.items.forEach((item, itemIndex) => {
          if (!item.title || typeof item.title !== 'string') {
            throw new Error(`Invalid item title in subgroup ${subgroup.name}`);
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

    console.log('Estimate validation successful');
    return new Response(
      JSON.stringify(parsedEstimate),
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
