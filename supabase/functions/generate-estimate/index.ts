
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

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
      console.log('Request data:', requestData);
    } catch (error) {
      console.error('Error parsing request body:', error);
      throw new Error('Invalid request body');
    }

    const { answers, projectDescription, category, leadId, imageUrl } = requestData;

    if (!leadId) {
      throw new Error('Missing leadId');
    }

    console.log('Generating estimate for:', { category, projectDescription, leadId, imageUrl });

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

    try {
      const messages = [{
        role: 'system',
        content: `You are a construction cost estimator. Your task is to return ONLY a valid JSON object with no additional text or explanation.
        The JSON must follow this exact format:
        {
          "ai_generated_title": "string (4 words or less)",
          "ai_generated_message": "string (2-3 sentences)",
          "groups": [
            {
              "name": "Group Name",
              "description": "Optional group description",
              "subgroups": [
                {
                  "name": "Subgroup Name",
                  "items": [
                    {
                      "title": "Item Title",
                      "description": "Item description",
                      "quantity": number,
                      "unit": "optional unit",
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
        }`
      }];

      // Add image analysis message if image URL is provided
      if (imageUrl) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: imageUrl
            },
            {
              type: 'text',
              text: 'Analyze this image and consider it when generating the estimate.'
            }
          ]
        });
      }

      // Add the main request message
      messages.push({
        role: 'user',
        content: `Based on the following information, generate ONLY a JSON response:
        Category: ${category || 'General Construction'}
        Description: ${projectDescription || 'Project estimate'}
        Questions and Answers:
        ${formattedAnswers.map(cat => `
        Category: ${cat.category}
        ${cat.questions.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n')}`).join('\n')}`
      });

      const response = await fetch('https://api.llama-api.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llamaApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model: "llama3.2-11b-vision",
          temperature: 0.2,
          stream: false,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        throw new Error(`Estimate generation failed: ${await response.text()}`);
      }

      const data = await response.json();
      console.log('Raw LLM response:', data);

      let parsedEstimate;
      try {
        const content = data.choices?.[0]?.message?.content;
        console.log('LLM content:', content);
        
        // Ensure we're working with a string before parsing
        if (typeof content !== 'string') {
          throw new Error('Invalid response format: content is not a string');
        }

        // Try to extract JSON if the response includes any extra text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON object found in response');
        }

        parsedEstimate = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('Error parsing LLM response:', parseError);
        throw new Error('Failed to parse estimate data');
      }

      if (!parsedEstimate || !parsedEstimate.groups || !Array.isArray(parsedEstimate.groups)) {
        throw new Error('Invalid estimate format: missing required fields');
      }

      // Update the lead with the estimate
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials');
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabaseAdmin
        .from('leads')
        .update({ 
          estimate_data: parsedEstimate,
          status: 'complete',
          estimated_cost: parsedEstimate.totalCost || 0,
          ai_generated_title: parsedEstimate.ai_generated_title,
          ai_generated_message: parsedEstimate.ai_generated_message
        })
        .eq('id', leadId);

      if (updateError) {
        throw updateError;
      }

      return new Response(JSON.stringify({ 
        message: "Estimate generated successfully",
        leadId
      }), { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      });

    } catch (error) {
      console.error('Error generating estimate:', error);
      // Update lead with error status
      if (leadId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
        
        await supabaseAdmin
          .from('leads')
          .update({ 
            status: 'error',
            error_message: error.message || 'Failed to generate estimate'
          })
          .eq('id', leadId);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in generate-estimate function:', error);
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
