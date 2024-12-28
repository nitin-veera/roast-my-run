import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { distance, elevation, duration } = await req.json();

    const prompt = `As a sarcastic running coach, create a funny but motivating roast about this run:
    - Distance: ${distance} km
    - Elevation Gain: ${elevation.gain}m
    - Elevation Loss: ${elevation.loss}m
    ${duration ? `- Duration: ${duration}` : ''}
    
    Keep the response under 100 words and make it humorous but not mean-spirited.`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.8,
      max_tokens: 150,
    });

    return NextResponse.json({ roast: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error generating roast:', error);
    return NextResponse.json(
      { error: 'Failed to generate roast' },
      { status: 500 }
    );
  }
} 