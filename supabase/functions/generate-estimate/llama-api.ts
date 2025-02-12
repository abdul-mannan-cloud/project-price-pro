
import { CategoryAnswers } from "./types.ts";

interface LlamaMessage {
  role: "system" | "user";
  content: string | Array<{ type: string; [key: string]: any }>;
}

interface LlamaRequest {
  messages: LlamaMessage[];
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  stream: boolean;
}

export async function generateLlamaResponse(
  context: string,
  imageUrl: string | undefined,
  llamaApiKey: string,
  signal: AbortSignal
): Promise<string> {
  const apiRequest: LlamaRequest = {
    messages: [
      {
        role: "system",
        content: "You are a construction cost estimator. Return a focused, concise estimate."
      },
      {
        role: "user",
        content: context
      }
    ],
    model: "llama-13b-chat",
    max_tokens: 300,
    temperature: 0.1,
    top_p: 1.0,
    frequency_penalty: 0.5,
    presence_penalty: 0.0,
    stream: false
  };

  if (imageUrl) {
    apiRequest.messages.splice(1, 0, {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: imageUrl
        },
        {
          type: "text",
          text: "Reference this image for the estimate."
        }
      ]
    });
  }

  console.log('Making request to LLaMA API with:', JSON.stringify(apiRequest, null, 2));
  
  const response = await fetch('https://api.llama-api.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${llamaApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(apiRequest),
    signal
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLaMA API request failed: ${errorText}`);
  }

  const rawResponse = await response.text();
  console.log('Raw API Response:', rawResponse);

  const data = JSON.parse(rawResponse);
  console.log('Parsed API Response:', data);

  // Extract AI response with fallbacks for different response formats
  if (data.choices && Array.isArray(data.choices) && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  } else if (data.response) {
    return data.response;
  } else if (data.generated_text) {
    return data.generated_text;
  } else if (data.output) {
    return typeof data.output === 'string' ? data.output : JSON.stringify(data.output);
  } else if (data.text) {
    return data.text;
  }
  
  return JSON.stringify(data);
}

export function formatAnswersForContext(answers: Record<string, any>): CategoryAnswers[] {
  return Object.entries(answers || {}).map(([category, categoryAnswers]) => {
    const questions = Object.entries(categoryAnswers || {}).map(([_, qa]) => ({
      question: qa.question,
      answer: qa.answers.map((ans: string) => {
        const option = qa.options.find((opt: any) => opt.value === ans);
        return option ? option.label : ans;
      }).join(', ')
    }));
    return { category, questions };
  });
}
