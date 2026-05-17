import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildSystemPrompt } from '@/lib/system-prompt';
import { getAdminDb } from '@/lib/firebase-admin';

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

    let systemPrompt = buildSystemPrompt(context);
    try {
      const snap = await getAdminDb().collection('settings').doc('ai').get();
      if (snap.exists) {
        const data = snap.data() || {};
        const customPersonality = (data.personality || '').trim();
        const customKnowledge = (data.knowledge || '').trim();
        if (customPersonality) {
          systemPrompt += `\n\n# Personalità (override del proprietario)\n${customPersonality}`;
        }
        if (customKnowledge) {
          systemPrompt += `\n\n# Conoscenza aggiuntiva\n${customKnowledge}`;
        }
      }
    } catch (err) {
      console.warn('Could not load AI config from Firestore:', err);
    }

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
        maxOutputTokens: 2048,
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
