import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectDescription, imageUrl, previousAnswers } = await req.json();
    console.log('Generating questions for:', { projectDescription, imageUrl, previousAnswers });

    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
    if (!llamaApiKey) {
      throw new Error('Missing LLAMA_API_KEY environment variable');
    }

    const systemPrompt = `You are an AI assistant helping contractors gather project requirements from customers.
    Based on the project description and image (if provided), generate exactly 7 focused questions.
    
    Questions should help understand:
    1. Project scope and specific requirements
    2. Timeline expectations
    3. Budget considerations
    4. Property details and constraints
    5. Material preferences
    6. Design preferences
    7. Special requirements or constraints
    
    Each question MUST:
    - Be customer-focused and help contractors better understand the project needs
    - Have exactly 4 relevant options
    - Be specific and actionable
    - Build upon previous answers if available
    
    Your response MUST be a valid JSON object with this exact structure:
    {
      "questions": [
        {
          "question": "string",
          "options": [
            { "id": "string", "label": "string" }
          ]
        }
      ]
    }`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Generate customer-focused questions for this project:
            Description: ${projectDescription || "New project inquiry"}
            Previous Answers: ${JSON.stringify(previousAnswers || {}, null, 2)}
            
            Remember:
            - Generate exactly 7 questions
            - Each question must have exactly 4 options
            - Questions should help contractors understand customer needs
            - Follow-up questions should be based on previous answers
            - All questions should be from customer perspective`
          },
          imageUrl ? {
            type: "image_url",
            image_url: imageUrl
          } : null
        ].filter(Boolean)
      }
    ];

    console.log('Sending request to Llama with messages:', JSON.stringify(messages, null, 2));

    const llamaResponse = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2-11b-vision',
        messages,
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!llamaResponse.ok) {
      const errorText = await llamaResponse.text();
      console.error('Llama API error response:', errorText);
      throw new Error(`Llama API error: ${llamaResponse.status} ${llamaResponse.statusText}`);
    }

    const data = await llamaResponse.json();
    console.log('Llama raw response:', JSON.stringify(data, null, 2));

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid Llama response structure:', data);
      return new Response(JSON.stringify(getDefaultQuestions()), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let questionsData;
    try {
      // Try to parse the content if it's a string, or use it directly if it's already an object
      const content = data.choices[0].message.content;
      questionsData = typeof content === 'string' ? JSON.parse(content.trim()) : content;
      
      // Validate the structure
      if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
        console.error('Invalid questions structure:', questionsData);
        return new Response(JSON.stringify(getDefaultQuestions()), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate each question has exactly 4 options
      const isValid = questionsData.questions.every(q => 
        q.question && 
        Array.isArray(q.options) && 
        q.options.length === 4 &&
        q.options.every(opt => opt.id && opt.label)
      );

      if (!isValid || questionsData.questions.length !== 7) {
        console.warn('Invalid question format or count, using defaults');
        return new Response(JSON.stringify(getDefaultQuestions()), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(questionsData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Failed to parse or validate Llama response:', error);
      return new Response(JSON.stringify(getDefaultQuestions()), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error generating questions:', error);
    return new Response(JSON.stringify(getDefaultQuestions()), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getDefaultQuestions() {
  return {
    questions: [
      {
        question: "What type of project are you looking to get an estimate for?",
        options: [
          { id: "renovation", label: "Home Renovation" },
          { id: "repair", label: "Repair Work" },
          { id: "installation", label: "New Installation" },
          { id: "maintenance", label: "General Maintenance" }
        ]
      },
      {
        question: "What is your desired timeline for this project?",
        options: [
          { id: "immediate", label: "As soon as possible" },
          { id: "1month", label: "Within 1 month" },
          { id: "3months", label: "Within 3 months" },
          { id: "flexible", label: "Flexible timeline" }
        ]
      },
      {
        question: "What is your budget range for this project?",
        options: [
          { id: "budget1", label: "Under $5,000" },
          { id: "budget2", label: "$5,000 - $10,000" },
          { id: "budget3", label: "$10,000 - $25,000" },
          { id: "budget4", label: "Over $25,000" }
        ]
      },
      {
        question: "What is the current state of the project area?",
        options: [
          { id: "new", label: "New construction" },
          { id: "good", label: "Good condition" },
          { id: "fair", label: "Fair condition" },
          { id: "poor", label: "Poor condition" }
        ]
      },
      {
        question: "Do you have specific material preferences?",
        options: [
          { id: "premium", label: "Premium quality" },
          { id: "standard", label: "Standard quality" },
          { id: "economic", label: "Budget-friendly" },
          { id: "undecided", label: "Need recommendations" }
        ]
      },
      {
        question: "What is your preferred style?",
        options: [
          { id: "modern", label: "Modern/Contemporary" },
          { id: "traditional", label: "Traditional" },
          { id: "transitional", label: "Transitional" },
          { id: "minimal", label: "Minimalist" }
        ]
      },
      {
        question: "Are there any special requirements or constraints?",
        options: [
          { id: "none", label: "No special requirements" },
          { id: "permit", label: "Permit needed" },
          { id: "hoa", label: "HOA approval required" },
          { id: "access", label: "Limited access to area" }
        ]
      }
    ]
  };
}