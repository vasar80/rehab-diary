import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildSystemPrompt } from '@/lib/system-prompt';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface ChatContext {
  name: string;
  sex?: 'M' | 'F';
  todayCompleted: boolean;
  streak: number;
  complianceRate: number;
  lastMood?: number;
  hasVideoToday: boolean;
  daysSinceLastVideo?: number;
  recentNotes?: string[];
  noticedCompensationsRecently?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY non configurata sul server' },
        { status: 503 }
      );
    }

    const body: { messages: ChatMessage[]; context: ChatContext } = await request.json();
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(context);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    });

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.text }],
    }));
    const lastMessage = messages[messages.length - 1];

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 400,
      },
    });

    const result = await chat.sendMessage(lastMessage.text);
    const responseText = result.response.text();

    return NextResponse.json({ text: responseText });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Chat error';
    console.error('Chat API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
