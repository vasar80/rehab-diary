import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildSystemPrompt } from '@/lib/system-prompt';
import { getAdminDb } from '@/lib/firebase-admin';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface DiaryEntrySummary {
  date: string;
  mood?: number;
  didTherapy?: boolean;
  therapyMinutes?: number;
  feeling?: number;
  practicedActions?: string;
  selectedActions?: string[];
  handInOtherActivities?: string;
  posture?: string;
  noticedCompensations?: boolean;
  compensationTypes?: string[];
  notes?: string;
}

interface ContractItemSummary {
  text: string;
  type: 'general' | 'specific';
  isActive: boolean;
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
  recentDiary?: DiaryEntrySummary[];
  contract?: ContractItemSummary[];
  clinicalInfo?: string;
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

    let customBasePrompt: string | undefined;
    let customClinicalInfo: string | undefined;
    try {
      const snap = await getAdminDb().collection('settings').doc('ai').get();
      if (snap.exists) {
        const data = snap.data() || {};
        const stored = (data.basePrompt || data.personality || '').trim();
        if (stored) customBasePrompt = stored;
        const k = (data.knowledge || '').trim();
        if (k) customClinicalInfo = k;
      }
    } catch (err) {
      console.warn('Could not load AI config from Firestore:', err);
    }

    const enrichedContext = { ...context, clinicalInfo: customClinicalInfo || context.clinicalInfo };
    const systemPrompt = buildSystemPrompt(enrichedContext, customBasePrompt);

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
