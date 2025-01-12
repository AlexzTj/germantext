import { NextResponse } from 'next/server';

// Type for the expected response structure
interface WordAnalysis {
  grammarDetailsAndUsage: string;
  example: {
    german: string;
    russian: string;
  };
}

// Helper function to parse and validate the OpenAI response
function parseOpenAIResponse(content: string): WordAnalysis {
  // Remove markdown code block formatting if present
  const jsonStr = content.replace(/```json\n|\n```/g, '').trim();
  
  try {
    const analysis = JSON.parse(jsonStr) as WordAnalysis;
    
    // Basic validation for required fields
    if (!analysis.grammarDetailsAndUsage || !analysis.example) {
      throw new Error('Response is missing required fields: "grammarDetailsAndUsage" or "example"');
    }
    
    return analysis;
  } catch (error) {
    console.error('Raw content:', content);
    console.error('Cleaned content:', jsonStr);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { word, context } = await request.json();

    // Validate input
    if (typeof word !== 'string' || typeof context !== 'string' || !word.trim() || !context.trim()) {
      return NextResponse.json(
        { error: 'Invalid input: "word" and "context" must be non-empty strings' },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('DeepSeek API key is not configured');
      return NextResponse.json(
        { error: 'DeepSeek API key is not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are a German language expert. Analyze German words and provide detailed grammatical information in Russian language. 
                      Always respond in JSON format matching the WordAnalysis type with the following structure:
                      {
                        "grammarDetailsAndUsage": "string",
                        "example": {
                          "german": "string",
                          "russian": "string"
                        }
                      }
                      grammarDetailsAndUsage should have html text, add line breaks, highligh with cursive or color or bold important things`,
          },
          {
            role: 'user',
            content: `Analyze the German word "${word}" in this context: "${context}".
                      Provide:
                      1. Base form with article for nouns or reflexive for verbs
                      2. Usage in the given context
                      3. Detailed grammar form explanation
                      4. Connected words (prepositions, articles, etc.)
                      5. One clear example: German sentence and Russian translation
                      
                      Ensure the response is a valid JSON object matching the specified structure.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      return NextResponse.json(
        { error: `OpenAI API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.text || data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Invalid response structure:', data);
      return NextResponse.json(
        { error: 'API response is missing expected content' },
        { status: 500 }
      );
    }

    try {
      const analysis = parseOpenAIResponse(content);
      return NextResponse.json(analysis);
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      console.log('Raw response content:', content);
      return NextResponse.json(
        { error: 'Failed to parse analysis result' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { 
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
