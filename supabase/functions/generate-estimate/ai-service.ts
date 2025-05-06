import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';


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
    signal: AbortSignal,
    description: string,
    category: string
) => {

    console.log('description testing ', description + ' ' + category)
    const similarTasks = await findSimilarTasks(`${category} : ${description}`, 3);
    console.log('similar tasks ', similarTasks)

    try {
        const messages = [
            {
                role: "system",
                content: `You are a professional contractor estimator. Generate detailed estimates based on project descriptions and answers to questions.

You will be provided with a list of Questions and Answers regarding what changes client wants in their project. One or multiple pictures of the current state of the project may also be provided.

Your task is to generate a detailed estimate based on the provided information. Divide the estimate into groups and subgroups, and provide a total cost for the project.

UNITS SPECIFICATION:
For each line item in the estimate, you MUST include the appropriate unit of measurement in parentheses after the title. Use only the following units:
${similarTasks}

For example, format titles like:
- "Flooring Installation (SF)"
- "Cabinet Installation (EA)"
- "Wall Demolition (SY)"

For each item in the estimate, provide:
- Title with appropriate unit: e.g., "Granite Countertops (LF)"
- Description: Detailed explanation of work
- Quantity: The number of units required
- Unit Amount: Price per unit
- Total Price: Quantity × Unit Amount

Keep these instructions in mind:
- Cost should be accurate according to the area from Address
- AI Instructions provided should be kept in priority
- Keep AI Rates in mind while calculating cost and calculate according to them
- Check for any AI preferences in the contractor settings which may include instructions about price limitations

MOST IMPORTANT INSTRUCTIONS (These take priority over all other instructions):
1. In contractor settings, find the markup_percentage and apply it to the total cost of the estimate
2. In contractor settings, find the tax_rate and apply it to the total cost
3. In contractor settings, find the minimum_project_cost value - THE TOTAL COST MUST ALWAYS BE HIGHER THAN THIS VALUE
4. If AI preference instructions indicate a maximum price limit, try to stay within that limit by adjusting the scope as needed, but never go below the minimum_project_cost

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
              "title": "string", // MUST include unit in parentheses, e.g., "Flooring (SF)"
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
                response_format: {type: "json_object"}
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

async function findSimilarTasks(query: string, limit = 10) {

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Generate embedding for the query
    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            input: query,
            model: 'text-embedding-3-small'
        })
    });

    const { data } = await response.json();

    // Query Supabase
    const { data: similarTasks } = await supabase.rpc('match_tasks', {
        query_embedding: data[0].embedding,
        match_threshold: 0.7,
        match_count: limit
    });

    console.log('rpc response', similarTasks);

    return similarTasks || [];
}