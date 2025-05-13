import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.38.4';


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

    const similarTasks = await findSimilarTasks(`${category} : ${description}`, 10);
    console.log('context testing',context)

    try {
        const messages = [
            {
                role: "system",
                content: `
                You are a professional contractor estimator. Generate detailed estimates based on project descriptions and answers to questions.

                    You will be provided with a list of Questions and Answers regarding what changes the client wants in their project.
                    One or multiple pictures of the current state may also be provided.

                    Your task is to generate a detailed estimate with the following intelligent features:

                    1. COST TYPE DETECTION:
                    - If only labor costs are required, clearly mark as 'LABOR ONLY' and only include labor costs.
                    - If only material costs are required, clearly mark as 'MATERIAL ONLY' and only include material costs.
                    - If both are required, add two Line Items, one for Material, One for Labor
                    - If in AI instructions, that Unit has 'Material+Labor' Type, mark as 'MATERIAL+LABOR' and include separate line items for both.
                    - The cost should be addition of labor and material costs in case of Material+Labor.
        
                    2. UNIT HANDLING:
                    - If a units list is provided, use only those specified units in parentheses after each title.
                    - If no units list is provided, determine the most appropriate unit for each item yourself.
                    - Common units include: SF (square feet), LF (linear feet), EA (each), SY (square yards), CY (cubic yards), HRS (hours).
                    - For Labor, use HRS (hours) as the unit.
                    - Below are units gotten from the similarty Search: ${similarTasks}
            
                    3. ESTIMATE STRUCTURE:  
                        - Divide into logical groups and subgroups.
                    - For each item include:
                        * Title with unit (e.g., 'Flooring Installation (SF)')
                        * Detailed description ( in description also include if its Labor/Material/Both )
                        * Quantity
                        * Unit amount
                        * Total price
                        * Cost type (Labor/Material/Labor+Material)
                    - Include subtotals for each subgroup.
            
                    4. FINANCIAL CALCULATIONS:
                        - Apply the markup_percentage from contractor settings to subtotals.
                        - Apply the tax_rate from contractor settings to the total.
                        - Ensure total cost exceeds minimum_project_cost.
                        - Respect maximum price limits if specified.
            
                    5. OUTPUT FORMAT:
                        - Always respond with valid JSON in this structure:
            
                    {
                        "projectType": "LABOR ONLY|MATERIAL ONLY|MATERIAL+LABOR",
                        "groups": [
                        {
                            "name": "string",
                            "description": "string",
                            "subgroups": [
                                {
                                    "name": "string",
                                    "items": [
                                        {
                                            "title": "string (UNIT)",
                                            "description": "string",
                                            "quantity": number,
                                            "unitAmount": number,
                                            "totalPrice": number,
                                            "costType": "Labor|Material|Labor+Material",
                                        }
                                    ],
                                    "subtotal": number
                                }
                            ]
                        }
                    ],
                        "totalCost": number,
                        "notes": "string"
                    }
            
                    6. SPECIAL INSTRUCTIONS:
                        - Always prioritize AI Instructions provided.
                        - Maintain accurate regional pricing.
                        - Clearly indicate when you've determined units yourself.
                        - Include any important assumptions in notes.
                        - Flag any potential scope issues.
            
                    7. MOST IMPORTANT RULES:
                        1. Never go below minimum_project_cost.
                        2. Always apply markup and tax correctly.
                        3. Be transparent about cost types (Labor/Material/Both).
                        4. Choose sensible units if none provided.
                        5. If Both Material and Labor are required for a task and added in AI Tasks, include both in the estimate
                        5. If Material+Labor is Not in AI tasks, then create two line items, one for Material and one for Labor.
                        6. Maintain JSON structure integrity.
        `

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
                model: 'gpt-4o',
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

    const {data} = await response.json();

    // Query Supabase
    const {data: similarTasks} = await supabase.rpc('match_tasks', {
        query_embedding: data[0].embedding,
        match_threshold: 0.5,
        match_count: limit,
        query_text: query
    });

    console.log('rpc response', similarTasks);

    return similarTasks || [];
}