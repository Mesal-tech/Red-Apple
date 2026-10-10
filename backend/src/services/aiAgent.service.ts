import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { config } from '../config';

export interface DoctorBookingSummary {
  id?: string;
  doctorId?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  scheduledTime?: string;
  consultationType?: string;
  status?: string;
  reason?: string;
}

export interface MedicalProfileSummary {
  reproductiveGoal?: string;
  birthControl?: string;
  knownConditions?: string[];
  medications?: string[];
  allergies?: string[];
  notes?: string;
}

export interface HealthContext {
  activeMode?: 'cycle' | 'pregnancy' | 'postmenopause' | 'general' | 'telemedicine';
  activeTopicFocus?: 'all' | 'cycle' | 'pregnancy' | 'menopause' | 'telemedicine' | 'wellness';
  userName?: string;
  userAge?: number;
  preferredModel?: string;
  appointments?: DoctorBookingSummary[] | null;
  medicalProfile?: MedicalProfileSummary | null;
  pregnancy?: {
    currentWeek?: number;
    trimester?: number;
    dueDate?: string;
    conceptionDate?: string;
    babySize?: string;
    kickCountToday?: number;
  } | null;
  postmenopause?: {
    stage?: string;
    yearsPostMenopause?: number;
    onHrt?: boolean;
    hotFlashesPerDay?: number;
  } | null;
  cycle?: {
    currentCycleDay?: number;
    cycleLength?: number;
    phaseName?: string;
    nextPeriodDate?: string;
    ovulationDate?: string;
    selectedDate?: string;
  } | null;
  // Legacy / Flat properties support
  currentCycleDay?: number;
  cycleLength?: number;
  phaseName?: string;
  nextPeriodDate?: string;
  selectedDate?: string;
}

export type CycleContext = HealthContext; // Backwards-compatible alias

export interface ExtractedSymptomLog {
  date?: string;
  category: 'cycle' | 'pregnancy' | 'postmenopause' | 'general';
  isPeriodDay: boolean;
  flowIntensity: 'none' | 'light' | 'medium' | 'heavy';
  symptoms: string[];
  feeling: string;
  notes: string;
  hasBiomarkers: boolean;
  pregnancyWeek?: number;
  lifeStageTag?: string;
}

export interface TriageResult {
  level: 'normal' | 'monitor' | 'consult_doctor';
  warningNote?: string;
  suggestTelemedicine: boolean;
}

export interface HealthAgentResponse {
  reply: string;
  extractedLog: ExtractedSymptomLog;
  triage: TriageResult;
  suggestedQuickReplies: string[];
  isAiGenerated: boolean;
}

// LangGraph State Annotation
export const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => curr.concat(update),
    default: () => [],
  }),
  healthContext: Annotation<HealthContext | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),
  extractedLog: Annotation<ExtractedSymptomLog>({
    reducer: (_, update) => update,
    default: () => ({
      category: 'general',
      isPeriodDay: false,
      flowIntensity: 'none',
      symptoms: [],
      feeling: 'Normal',
      notes: '',
      hasBiomarkers: false,
    }),
  }),
  triage: Annotation<TriageResult>({
    reducer: (_, update) => update,
    default: () => ({
      level: 'normal',
      suggestTelemedicine: false,
    }),
  }),
  reply: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),
  suggestedQuickReplies: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  isAiGenerated: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => false,
  }),
});

export type AgentStateType = typeof AgentStateAnnotation.State;

/**
 * Biomarker detection disabled per requirement - returns clean non-logging dummy object
 */
export function extractBiomarkersFromText(_text: string, _healthContext?: HealthContext): ExtractedSymptomLog {
  return {
    category: 'general',
    isPeriodDay: false,
    flowIntensity: 'none',
    symptoms: [],
    feeling: 'Calm',
    notes: '',
    hasBiomarkers: false,
  };
}

/**
 * Multi-domain Red Flag Triage
 */
export function evaluateTriage(text: string, extracted?: ExtractedSymptomLog, healthContext?: HealthContext): TriageResult {
  const lower = text.toLowerCase();
  const isPregnant = healthContext?.activeMode === 'pregnancy' || extracted?.category === 'pregnancy';
  const isPostmenopause = healthContext?.activeMode === 'postmenopause' || extracted?.category === 'postmenopause';

  // 1. Pregnancy Red Flags
  if (isPregnant) {
    const pregnancyBleeding = lower.includes('bleed') || lower.includes('blood') || lower.includes('spotting');
    const severeCramps = lower.includes('severe cramp') || lower.includes('sharp pain') || lower.includes('intense pain');
    const reducedMovement = lower.includes('no kicks') || lower.includes('stopped moving') || lower.includes('not moving');
    const preeclampsiaSigns = (lower.includes('blurry vision') || lower.includes('flashing light')) && lower.includes('headache');

    if (pregnancyBleeding || severeCramps || reducedMovement || preeclampsiaSigns) {
      return {
        level: 'consult_doctor',
        warningNote:
          'During pregnancy, symptoms such as vaginal bleeding, sharp abdominal pain, or decreased fetal movement require urgent medical evaluation. Please consult a doctor immediately.',
        suggestTelemedicine: true,
      };
    }
  }

  // 2. Postmenopause Red Flags
  if (isPostmenopause) {
    const postmenopauseBleeding = lower.includes('bleed') || lower.includes('blood') || lower.includes('period started again');
    if (postmenopauseBleeding) {
      return {
        level: 'consult_doctor',
        warningNote:
          'Any vaginal bleeding occurring after menopause must be promptly evaluated by a gynaecologist to rule out endometrial abnormalities.',
        suggestTelemedicine: true,
      };
    }
  }

  // 3. General & Cycle Red Flags
  const isSeverePain =
    lower.includes('unbearable') ||
    lower.includes('severe pain') ||
    lower.includes('extreme pain') ||
    lower.includes('excruciating') ||
    lower.includes('cannot walk') ||
    lower.includes("can't stand");

  const isSevereBleeding =
    lower.includes('soaking through') ||
    lower.includes('pad every hour') ||
    lower.includes('huge clot') ||
    lower.includes('flooding');

  const isHighFever =
    (lower.includes('fever') || lower.includes('chills')) &&
    (lower.includes('pelvic') || lower.includes('cramp') || lower.includes('period') || lower.includes('abdomen'));

  const isFainting = lower.includes('fainted') || lower.includes('passed out') || lower.includes('blacked out');

  if (isSeverePain || isSevereBleeding || isHighFever || isFainting) {
    return {
      level: 'consult_doctor',
      warningNote:
        'Your symptoms indicate possible acute pain, severe hemorrhage, or systemic distress that requires medical evaluation. Consider consulting a doctor immediately.',
      suggestTelemedicine: true,
    };
  }

  if (lower.includes('heavy flow') || lower.includes('bad cramps') || lower.includes('migraine')) {
    return {
      level: 'monitor',
      warningNote: 'You have recorded some notable symptoms. Keep hydrated, rest, and monitor your comfort.',
      suggestTelemedicine: false,
    };
  }

  return {
    level: 'normal',
    suggestTelemedicine: false,
  };
}

/**
 * Builds user context string for LLM prompting
 */
function formatHealthSummary(context?: HealthContext): string {
  if (!context) return 'Life Stage: Comprehensive Women\'s Health & Reproductive Wellness.';

  const parts: string[] = [];
  if (context.userName) parts.push(`User Name: ${context.userName}`);
  if (context.userAge) parts.push(`Age: ${context.userAge}`);

  if (context.activeTopicFocus && context.activeTopicFocus !== 'all') {
    parts.push(`Current Topic Focus: ${context.activeTopicFocus.toUpperCase()}`);
  }

  // 1. Reproductive Goals & Medical Profile
  if (context.medicalProfile?.reproductiveGoal) {
    const goalPretty = context.medicalProfile.reproductiveGoal.replace(/_/g, ' ');
    parts.push(`Reproductive Goal: ${goalPretty}`);
  }
  if (context.medicalProfile?.birthControl) {
    parts.push(`Contraception: ${context.medicalProfile.birthControl}`);
  }
  if (context.medicalProfile?.knownConditions?.length) {
    parts.push(`Known Conditions: ${context.medicalProfile.knownConditions.join(', ')}`);
  }

  // 2. Upcoming Telemedicine Bookings
  if (context.appointments && context.appointments.length > 0) {
    const appts = context.appointments.slice(0, 3).map((a) => {
      const doc = a.doctorName || 'Specialist';
      const spec = a.doctorSpecialty || 'OB-GYN';
      let time = a.scheduledTime || 'Upcoming';
      try {
        const d = new Date(time);
        if (!isNaN(d.getTime())) {
          time = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      } catch {}
      return `${doc} (${spec}, ${time}, ${a.status || 'confirmed'})`;
    }).join('; ');
    parts.push(`Booked Doctor Consultations: ${appts}`);
  }

  // 3. Pregnancy Data (if active or provided)
  if (context.activeMode === 'pregnancy' || context.pregnancy) {
    const p = context.pregnancy;
    parts.push(`Pregnancy: Gestational Week ${p?.currentWeek || 16}, Trimester ${p?.trimester || 2}, Due Date: ${p?.dueDate || 'Upcoming'}, Baby Size Analogy: ${p?.babySize || 'Avocado'}${p?.kickCountToday ? `, Kicks Today: ${p.kickCountToday}` : ''}`);
  }

  // 4. Menopause Data (if active or provided)
  if (context.activeMode === 'postmenopause' || context.postmenopause) {
    parts.push(`Menopause Stage: ${context.postmenopause?.stage || 'Postmenopause Care'}${context.postmenopause?.onHrt ? ' (HRT Active)' : ''}`);
  }

  // 5. Menstrual Cycle Data
  if (context.cycle || context.currentCycleDay || context.activeMode === 'cycle') {
    const c = context.cycle;
    const day = c?.currentCycleDay || context.currentCycleDay || 1;
    const phase = c?.phaseName || context.phaseName || 'Follicular Phase';
    const len = c?.cycleLength || context.cycleLength || 28;
    parts.push(`Menstrual Cycle: Day ${day} of ${len}, Phase: ${phase}, Next Period: ${c?.nextPeriodDate || context.nextPeriodDate || 'Upcoming'}`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'Comprehensive Women\'s Health & Reproductive Wellness.';
}



/**
 * Constructs the LangGraph Agent Graph
 */
export function buildHealthAgentGraph() {
  const workflow = new StateGraph(AgentStateAnnotation)
    // 1. Multi-Domain Clinical Reasoning Node (Google Gemini LLM with Full Life-Stage Persona)
    .addNode('reasoning', async (state) => {
      const apiKey = config.gemini.apiKey;
      let replyText = '';
      let isAiGenerated = false;

      if (apiKey && apiKey.trim().length > 0) {
        try {
          const healthSummary = formatHealthSummary(state.healthContext);

          const systemPrompt = new SystemMessage(
            `You are the user's loving, cheerful, and protective senior sister ("Big Sis").
You know all about female bodies, menstrual cycles, pregnancy, and wellness. You make her feel completely safe, comforted, and at ease.

STRICT RULES:
1. EXACTLY 2 TO 3 SHORT SENTENCES: Your entire response MUST be only 2 to 3 concise sentences (one single short paragraph, around 35-50 words). NEVER write multiple paragraphs, bullet lists, or long explanations!
2. STRICTLY NO INTRO SLOP: NEVER say "Hi, I am [name]", "I am your AI companion...", "I'm here to help you with...", "As an AI...", or any robotic greeting. Jump straight into speaking to her warmly like an older sister.
3. PERSONALITY: Cheerful, kind, sweet, and comforting (e.g., "Take a deep breath sis, I've got you 💕", "Aww babe, don't worry!").
4. DIRECT & PRACTICAL: In those 2-3 sentences, give a direct answer/explanation and 1 comforting action or safety check. If bleeding is heavy or painful, lovingly tell her to consult a doctor right away.

User Health Context:
${healthSummary}`
          );

          const model = new ChatGoogleGenerativeAI({
            apiKey,
            model: 'gemini-2.5-flash',
            temperature: 0.5,
            maxOutputTokens: 1000,
          });

          const result = await model.invoke([
            systemPrompt,
            ...state.messages,
          ]);

          replyText = result.content.toString();
          isAiGenerated = true;
        } catch (error) {
          console.warn('[LangGraph] Gemini invocation error:', error);
        }
      }

      return {
        reply: replyText,
        isAiGenerated,
      };
    })

    // 2. Biomarker Extractor Node
    .addNode('extractor', async (state) => {
      const lastUserMsg = state.messages[state.messages.length - 1]?.content.toString() || '';
      const extracted = extractBiomarkersFromText(lastUserMsg, state.healthContext);

      return {
        extractedLog: extracted,
        reply: state.reply || '',
      };
    })

    // 3. Triage & Life-Stage Quick Replies Node
    .addNode('triageNode', async (state) => {
      const lastUserMsg = state.messages[state.messages.length - 1]?.content.toString() || '';
      const triage = evaluateTriage(lastUserMsg, state.extractedLog, state.healthContext);

      const quickReplies: string[] = [];
      const mode = state.healthContext?.activeMode || state.extractedLog.category;

      if (mode === 'pregnancy') {
        quickReplies.push('How big is my baby this week?');
        quickReplies.push('Safe prenatal nutrition tips');
        quickReplies.push('When should I schedule an ultrasound?');
      } else if (mode === 'postmenopause') {
        quickReplies.push('How to reduce severe hot flashes?');
        quickReplies.push('Is HRT safe for me?');
        quickReplies.push('Best supplements for bone density');
      } else if (mode === 'cycle') {
        quickReplies.push('When is my fertile window?');
        quickReplies.push('What natural remedies help cramps?');
        quickReplies.push('Hormonal shifts in this phase');
      } else {
        quickReplies.push('Birth control methods comparison');
        quickReplies.push('PCOS vs Endometriosis differences');
        quickReplies.push('Consult a doctor on Telemedicine');
      }

      return {
        triage,
        suggestedQuickReplies: quickReplies,
      };
    })
    .addEdge(START, 'reasoning')
    .addEdge('reasoning', 'extractor')
    .addEdge('extractor', 'triageNode')
    .addEdge('triageNode', END);

  return workflow.compile();
}

/**
 * Public agent runner function
 */
export async function runHealthAgent(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  healthContext?: HealthContext
): Promise<HealthAgentResponse> {
  const graph = buildHealthAgentGraph();

  const messages: BaseMessage[] = history.map((msg) =>
    msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
  );
  messages.push(new HumanMessage(userMessage));

  const result = await graph.invoke({
    messages,
    healthContext,
  });

  return {
    reply: result.reply,
    extractedLog: result.extractedLog,
    triage: result.triage,
    suggestedQuickReplies: result.suggestedQuickReplies,
    isAiGenerated: result.isAiGenerated,
  };
}

/**
 * Real-time Streaming Health Agent (Gemini 2.5)
 */
export async function* streamHealthAgent(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  healthContext?: HealthContext
): AsyncGenerator<{ type: 'chunk'; content: string } | { type: 'meta'; triage: TriageResult; suggestedQuickReplies: string[] }> {
  const apiKey = config.gemini.apiKey;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('Google Gemini API key is missing or not configured.');
  }

  const healthSummary = formatHealthSummary(healthContext);

  const systemPrompt = new SystemMessage(
    `You are the user's loving, cheerful, and protective senior sister ("Big Sis").
You know all about female bodies, menstrual cycles, pregnancy, and wellness. You make her feel completely safe, comforted, and at ease.

STRICT RULES:
1. EXACTLY 2 TO 3 SHORT SENTENCES: Your entire response MUST be only 2 to 3 concise sentences (one single short paragraph, around 35-50 words). NEVER write multiple paragraphs, bullet lists, or long explanations!
2. STRICTLY NO INTRO SLOP: NEVER say "Hi, I am [name]", "I am your AI companion...", "I'm here to help you with...", "As an AI...", or any robotic greeting. Jump straight into speaking to her warmly like an older sister.
3. PERSONALITY: Cheerful, kind, sweet, and comforting (e.g., "Take a deep breath sis, I've got you 💕", "Aww babe, don't worry!").
4. DIRECT & PRACTICAL: In those 2-3 sentences, give a direct answer/explanation and 1 comforting action or safety check. If bleeding is heavy or painful, lovingly tell her to consult a doctor right away.

User Health Context:
${healthSummary}`
  );

  const model = new ChatGoogleGenerativeAI({
    apiKey,
    model: 'gemini-2.5-flash',
    temperature: 0.5,
    maxOutputTokens: 1000,
  });

  const messages: BaseMessage[] = history.map((msg) =>
    msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
  );
  messages.push(new HumanMessage(userMessage));

  const stream = await model.stream([systemPrompt, ...messages]);

  for await (const chunk of stream) {
    const text = chunk.content?.toString() || '';
    if (text) {
      yield { type: 'chunk', content: text };
    }
  }

  const triage = evaluateTriage(userMessage, undefined, healthContext);
  const quickReplies: string[] = [];
  const mode = healthContext?.activeMode || 'cycle';

  if (mode === 'pregnancy') {
    quickReplies.push('How big is my baby this week?');
    quickReplies.push('Safe prenatal nutrition tips');
    quickReplies.push('When should I schedule an ultrasound?');
  } else if (mode === 'postmenopause') {
    quickReplies.push('How to reduce hot flashes?');
    quickReplies.push('Is HRT safe for me?');
    quickReplies.push('Best supplements for bone density');
  } else if (mode === 'cycle') {
    quickReplies.push('When is my fertile window?');
    quickReplies.push('What natural remedies help cramps?');
    quickReplies.push('Hormonal shifts in this phase');
  } else {
    quickReplies.push('Best remedies for period cramps');
    quickReplies.push('How to track ovulation');
    quickReplies.push('Consult a doctor on Telemedicine');
  }

  yield {
    type: 'meta',
    triage,
    suggestedQuickReplies: quickReplies,
  };
}
