import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

interface MeasurementRequest {
    image: string; // base64 encoded image
    description: string;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const controller = new AbortController();
    const { signal } = controller;

    try {
        console.log('Starting measurement process...');

        // Clone the request before reading it
        const clonedReq = req.clone();
        const requestData: MeasurementRequest = await clonedReq.json();

        if (!requestData.image) {
            throw new Error('Base64 image data is required');
        }

        if (!requestData.description) {
            throw new Error('Description of what to measure is required');
        }

        const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openAIApiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const measurement = await getMeasurementFromAI(
            requestData.image,
            requestData.description,
            openAIApiKey,
            signal
        );

        console.log('Measurement completed successfully');
        return new Response(
            JSON.stringify(measurement),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in measurement function:', error);

        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'An unexpected error occurred',
                details: error instanceof Error ? error.stack : undefined
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    } finally {
        controller.abort();
    }
});

async function getMeasurementFromAI(
    base64Image: string,
    description: string,
    openAIApiKey: string,
    signal: AbortSignal
): Promise<any> {
    try {
        // Make sure the base64 image is properly formatted
        let imageData = base64Image;
        if (!imageData.startsWith('data:image/')) {
            // Add data URI prefix if not present
            imageData = `data:image/jpeg;base64,${imageData}`;
        }

        const systemPrompt = `You are a professional measurement expert specialized in extracting accurate measurements from images.
    
Your task is to analyze the provided image and determine the measurement of the specific part described by the user.

Instructions:
1. Focus only on the described part of the image
2. Provide your best estimate of the measurements (width, height, length, area, or volume as appropriate)
3. Explain your reasoning process, including any visual cues you used to determine scale
4. Express measurements in the most appropriate unit (inches, feet, meters, etc.)
5. Indicate your confidence level in the measurement (low, medium, high)

ALWAYS respond with valid JSON in the following format:
{
  "measurements": {
    "primary": {
      "value": number,
      "unit": "string",
      "dimension": "string" // width, height, length, area, volume, etc.
    },
    "additional": [
      {
        "value": number,
        "unit": "string",
        "dimension": "string"
      }
    ]
  },
  "confidence": "string", // low, medium, high
  "reasoning": "string",
  "recommendations": "string" // optional advice for more accurate measurement
}`;

        const messages = [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `Please measure the following in this image: ${description}`
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: imageData
                        }
                    }
                ]
            }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAIApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages,
                temperature: 0.3,
                max_tokens: 1000,
                response_format: { type: "json_object" }
            }),
            signal
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Invalid response format from OpenAI');
        }

        const content = data.choices[0].message.content;
        console.log('Raw AI measurement response:', content);

        // Ensure we have valid JSON
        const parsed = typeof content === 'string' ? JSON.parse(content) : content;

        // Validate structure
        if (!parsed.measurements || !parsed.measurements.primary) {
            console.error('Invalid measurement structure:', parsed);
            throw new Error('AI response missing required measurement fields');
        }

        return parsed;

    } catch (error) {
        console.error('Error getting measurement from AI:', error);
        if (error instanceof SyntaxError) {
            throw new Error('AI response was not valid JSON');
        }
        throw error;
    }
}