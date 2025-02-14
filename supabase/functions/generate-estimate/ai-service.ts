
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
        content: "You are a professional contractor estimator. Generate detailed estimates based on project descriptions and answers to questions."
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
            image_url: imageUrl
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
        max_tokens: 2000
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating estimate with AI:', error);
    throw error;
  }
};
