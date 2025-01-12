import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { germanPhrase, russianTranslation } = await request.json();
  
  try {
    const response = await fetch(process.env.ANKI_CONNECT_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: "addNote",
        version: 6,
        params: {
          note: {
            deckName: process.env.ANKI_DECK_NAME,
            modelName: "Basic",
            fields: {
              Front: germanPhrase,
              Back: russianTranslation
            },
            options: {
              allowDuplicate: false
            },
            tags: ["german-learning-app"]
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error('Anki Connect error');
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Anki operation failed' }, { status: 500 });
  }
} 