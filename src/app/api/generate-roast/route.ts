import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const { distance, unit, duration } = await request.json();

    const promptContent = duration
      ? `Roast my running route that is ${distance} ${unit} long and took ${duration} to complete.`
      : `Roast my running route that is ${distance} ${unit} long.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a sarcastic running coach who likes to playfully roast runners about their routes. Keep responses under 100 words and make them funny but not mean-spirited."
        },
        {
          role: "user",
          content: promptContent
        }
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    return NextResponse.json({ roast: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to generate roast' }, { status: 500 });
  }
}