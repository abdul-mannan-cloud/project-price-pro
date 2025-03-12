
export const formatAnswersForContext = (answers: Record<string, any>) => {
  return Object.entries(answers).reduce((acc, [category, categoryAnswers]) => {
    acc[category] = Object.entries(categoryAnswers || {}).reduce((catAcc, [questionId, answer]) => {
      catAcc[questionId] = {
        question: answer.question,
        type: answer.type,
        answers: answer.answers,
        options: answer.options
      };
      return catAcc;
    }, {} as Record<string, any>);
    return acc;
  }, {} as Record<string, any>);
};

export const generateEstimate = async (
  context: string,
  imageUrl: string | undefined,
  openAIApiKey: string,
  signal: AbortSignal
) => {
  try {
    const messages = [
      {
        role: "system",
        content: `You are a professional contractor estimator. Generate detailed estimates based on project descriptions and answers to questions. 
        
        You will be provided with list of Questions and Answers regarding what changing client want in their project. one or multiple pictures of the current state of project may also be provided.
        Your Task is to generate a detailed estimate based on the provided information Specially keep in mind the Address. Divide the estimate into groups and subgroups, and provide a total cost for the project. You may also include any additional notes or instructions.
        For each item in the estimate, provide a title, description, quantity, unit amount, and total price. Ensure that the total price for each subgroup is calculated correctly and that the total cost for the project is accurate.
        
        Keep some instructions in mind:
          - Cost should be accurate according to area from Address
          - You are going to be provided with AI Instructions also keep them in priority
          - Keep AI Rates in mind while calculating cost and Calculate according to them
        
        ALWAYS respond with valid JSON in the following format:
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
          "notes": "string"
        }`
      },
      {
        role: "user",
        content: context
      }
    ];

    if (imageUrl) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: "Please also consider this project image in your estimate:"
          },
          {
            type: "image_url",
            image_url: {
                url: imageUrl
            }
          }
        ]
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
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
    console.log('Raw AI response content:', content);

    // Ensure we have valid JSON
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    
    // Validate structure
    if (!parsed.groups || !Array.isArray(parsed.groups) || typeof parsed.totalCost !== 'number') {
      console.error('Invalid response structure:', parsed);
      throw new Error('AI response missing required fields');
    }

    // Return stringified JSON to ensure consistent format
    return JSON.stringify(parsed);

  } catch (error) {
    console.error('Error generating estimate with AI:', error);
    if (error instanceof SyntaxError) {
      throw new Error('AI response was not valid JSON');
    }
    throw error;
  }
};
