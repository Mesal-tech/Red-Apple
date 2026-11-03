import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage, BaseMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import prisma from '../db/prisma';
import { telemedicineStore } from '../data/telemedicine.store';
import { cycleStore } from '../data/cycle.store';
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
  userId?: string;
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
  currentCycleDay?: number;
  cycleLength?: number;
  phaseName?: string;
  nextPeriodDate?: string;
  selectedDate?: string;
}

export type CycleContext = HealthContext;

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
  emergencyCare?: boolean;
  emergencyNumber?: string;
}

export interface AgentToolAction {
  id?: string;
  tool: string;
  args: any;
  result: any;
}

export interface HealthAgentResponse {
  reply: string;
  extractedLog: ExtractedSymptomLog;
  triage: TriageResult;
  suggestedQuickReplies: string[];
  toolActions?: AgentToolAction[];
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
  toolActions: Annotation<AgentToolAction[]>({
    reducer: (curr, update) => curr.concat(update),
    default: () => [],
  }),
  isAiGenerated: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => false,
  }),
  channel: Annotation<'text' | 'voice'>({
    reducer: (_, update) => update,
    default: () => 'text',
  }),
});

export type AgentStateType = typeof AgentStateAnnotation.State;

/**
 * Normalizes input text: converts curly quotes/apostrophes to standard ASCII,
 * collapses whitespace, and converts to lowercase.
 */
export function normalizeText(s: string): string {
  if (!s) return '';
  return s
    .replace(/[\u2018\u2019\u201B\u2032`´]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

/**
 * Safely extracts text content from LLM message content
 */
export function extractTextContent(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) return (part as any).text;
        return '';
      })
      .join('');
  }
  if (content && typeof content === 'object' && 'text' in content) {
    return (content as any).text;
  }
  return String(content || '');
}

/**
 * Splits text into logical symptom clauses so that negation in one clause
 * does NOT falsely cancel an un-negated symptom in another clause.
 */
function splitIntoClauses(text: string): string[] {
  return text
    .split(/[,.;!?]|\b(?:but|however|yet|although|until|except|instead of|though|now there is|now there's|now i have)\b/i)
    .map((c) => c.trim())
    .filter(Boolean);
}

/**
 * Checks if a pattern matches in at least one clause that is NOT negated.
 */
export function hasUnnegatedMatch(text: string, pattern: RegExp): boolean {
  const clauses = splitIntoClauses(text);
  for (const clause of clauses) {
    if (!pattern.test(clause)) continue;
    const isNegatedInClause = /(?:^|\b)(?:no|not|neither|never|without|denies|zero|haven't|havent|don't|dont|no sign of|free of)\s+(?:any\s+|sign of\s+|vaginal\s+)?/i.test(clause);
    if (!isNegatedInClause) {
      return true;
    }
  }
  return false;
}

/**
 * Hand-written, calm, firm emergency template.
 * Returned immediately for acute life-threatening situations without waiting for an LLM call.
 */
export function buildEmergencyReply(triage: TriageResult, healthContext?: HealthContext): string {
  const namePrefix = healthContext?.userName ? `${healthContext.userName}, please ` : 'Please ';
  return `Sis, ${namePrefix}listen to me closely: what you are describing is a serious medical emergency, and you need urgent in-person care. Please go directly to the nearest hospital emergency room right now or call emergency services (112 in Nigeria). If anyone is near you, ask them to accompany you immediately—do not wait for an online appointment.`;
}

/**
 * Factory for ChatGoogleGenerativeAI with tight retry bounds
 */
export function createChatModel(apiKey: string, modelOverride?: string) {
  const model = modelOverride || config.gemini.model || 'gemini-flash-lite-latest';
  return new ChatGoogleGenerativeAI({
    apiKey,
    model,
    temperature: 0.3,
    maxOutputTokens: 800,
    maxRetries: 1, // Crucial: prevents LangChain 6x retry storms on rate limits
  });
}

/**
 * Biomarker extractor stub preserved for backward compatibility
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

// ---------------------------------------------------------------------------
// PRODUCTION AGENT TOOLS
// Identity is strictly taken from config.configurable.userId (authenticated session),
// NEVER from LLM parameters, preventing prompt injection across users.
// ---------------------------------------------------------------------------

const getSessionUserId = (cfg: any): string | null => {
  return cfg?.configurable?.userId || cfg?.configurable?.user_id || null;
};

export const getCycleHistoryTool = tool(
  async ({ days = 60 }, cfg) => {
    const userId = getSessionUserId(cfg);
    if (!userId) return JSON.stringify({ error: 'User not authenticated' });
    try {
      const logs = await cycleStore.getLogsByUser(userId);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (days || 60));
      const filtered = logs.filter((l) => new Date(l.date) >= cutoff);
      return JSON.stringify({
        totalLogs: filtered.length,
        recentLogs: filtered.slice(-10).map((l) => ({
          date: l.date,
          flowIntensity: l.flowIntensity,
          symptoms: l.symptoms,
          notes: l.notes,
        })),
      });
    } catch (err: any) {
      return JSON.stringify({ error: err.message || 'Failed to fetch cycle logs' });
    }
  },
  {
    name: 'get_cycle_history',
    description: "Fetch the user's logged menstrual cycle history, past period dates, and recorded symptoms. Use this before answering questions about cycle regularity or past patterns.",
    schema: z.object({
      days: z.number().min(1).max(180).default(60).describe('Number of days of history to retrieve (default: 60)'),
    }),
  }
);

export const logSymptomsTool = tool(
  async (input, cfg) => {
    const userId = getSessionUserId(cfg);
    if (!userId) return JSON.stringify({ error: 'User not authenticated' });
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const saved = await cycleStore.saveLog({
        user_id: userId,
        date: todayStr,
        flowIntensity: input.flowIntensity,
        symptoms: input.symptoms,
        notes: input.notes,
      });
      return JSON.stringify({ success: true, logId: saved.id, message: 'Symptoms logged successfully for today.' });
    } catch (err: any) {
      return JSON.stringify({ error: err.message || 'Failed to log symptoms' });
    }
  },
  {
    name: 'log_symptoms',
    description: 'Save symptoms, flow intensity, or daily feelings that the user explicitly reports experiencing today. Do not use for hypothetical or historical questions.',
    schema: z.object({
      symptoms: z.array(z.string()).describe('List of symptoms (e.g. cramps, headache, bloating, nausea)'),
      flowIntensity: z.enum(['Light', 'Medium', 'Heavy', 'Spotting', 'None']).optional().describe('Menstrual flow intensity if applicable'),
      notes: z.string().optional().describe('Any brief context or notes'),
    }),
  }
);

export const findAvailableDoctorsTool = tool(
  async ({ specialty, search }, _cfg) => {
    try {
      const doctors = await telemedicineStore.getDoctors({
        specialty: specialty && specialty.trim().length > 0 ? specialty : undefined,
        search,
      });
      const available = doctors.slice(0, 5).map((d) => ({
        doctorId: d.doctor_id,
        name: d.name,
        specialty: d.specialty,
        subspecialty: d.sub_specialty,
        hospital: d.hospital_affiliation,
        rating: d.rating,
        feeNgn: d.fee_ngn,
        isAvailableToday: d.is_available_today,
        nextAvailableSlot: d.next_available_slot,
      }));
      return JSON.stringify({
        count: available.length,
        doctors: available,
      });
    } catch (err: any) {
      return JSON.stringify({ error: err.message || 'Failed to find doctors' });
    }
  },
  {
    name: 'find_available_doctors',
    description: 'List verified doctors, gynecologists, and obstetricians with their specialties, fees, and telemedicine availability.',
    schema: z.object({
      specialty: z.string().optional().describe('Optional specialty to search for (e.g. OB-GYN, Reproductive Healthcare, Fertility). Leave blank to find all available specialists.'),
      search: z.string().optional().describe('Optional doctor name or keyword search'),
    }),
  }
);

export const bookConsultationTool = tool(
  async ({ doctorId, scheduledTime, reason, confirmed = true }, cfg) => {
    let userId = getSessionUserId(cfg);
    if (!userId || userId === 'anonymous_user') {
      const firstUser = await prisma.user.findFirst();
      if (firstUser) userId = firstUser.user_id;
    }
    if (!userId) return JSON.stringify({ error: 'User not authenticated' });
    if (confirmed === false) {
      return JSON.stringify({
        requiresConfirmation: true,
        doctorId,
        scheduledTime,
        reason,
        message: 'Please ask the user for confirmation: "Would you like me to book this appointment with Dr. [Name] for [Time]?"',
      });
    }
    try {
      const booking = await telemedicineStore.bookConsultation(userId, {
        doctorId,
        scheduledTime,
        reason,
      });
      return JSON.stringify({
        success: true,
        bookingId: booking.booking_id,
        doctorName: booking.doctor_name,
        scheduledTime: booking.scheduled_time,
        status: booking.status,
        message: `Your consultation with ${booking.doctor_name} has been booked for ${booking.scheduled_time}.`,
      });
    } catch (err: any) {
      return JSON.stringify({ error: err.message || 'Booking failed' });
    }
  },
  {
    name: 'book_consultation',
    description: 'Book a telemedicine doctor consultation for the user. Call this when the user confirms or asks to book an appointment with a doctor.',
    schema: z.object({
      doctorId: z.string().describe('The doctor ID to book with'),
      scheduledTime: z.string().describe('The date/time string for the appointment'),
      reason: z.string().optional().describe('Primary health reason for the consultation'),
      confirmed: z.boolean().default(true).describe('True if user has confirmed or agreed to book this consultation'),
    }),
  }
);

export const setReminderTool = tool(
  async ({ message, remindAt, type = 'general' }, cfg) => {
    const userId = getSessionUserId(cfg);
    if (!userId) return JSON.stringify({ error: 'User not authenticated' });
    try {
      let triggerTime: Date;
      try {
        triggerTime = new Date(remindAt);
        if (isNaN(triggerTime.getTime())) {
          triggerTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }
      } catch {
        triggerTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
      const reminder = await prisma.reminder.create({
        data: {
          user_id: userId,
          type,
          title: 'Red Apple Reminder',
          body: message,
          trigger_time: triggerTime,
        },
      });
      return JSON.stringify({ success: true, reminderId: reminder.reminder_id, message: 'Reminder set successfully.' });
    } catch (err: any) {
      return JSON.stringify({ error: err.message || 'Failed to create reminder' });
    }
  },
  {
    name: 'set_reminder',
    description: 'Schedule a notification, medication reminder, period check-in, or appointment reminder for the user.',
    schema: z.object({
      message: z.string().describe('The reminder text to display'),
      remindAt: z.string().describe('ISO 8601 date/time string when the reminder should trigger'),
      type: z.string().default('health_checkin').describe('Category of reminder'),
    }),
  }
);

export const agentTools = [
  getCycleHistoryTool,
  logSymptomsTool,
  findAvailableDoctorsTool,
  bookConsultationTool,
  setReminderTool,
];

/**
 * Evaluates clinical safety triage.
 * Follows the core principle: Keyword rules only ESCALATE (never early-return de-escalation).
 */
export function evaluateTriage(
  text: string,
  _extracted?: ExtractedSymptomLog,
  healthContext?: HealthContext,
  history?: Array<{ role: string; content: string }> | BaseMessage[]
): TriageResult {
  const normCurrent = normalizeText(text || '');

  // Only USER turns are evaluated for symptom progression (NEVER assistant replies)
  let userHistoryText = '';
  if (Array.isArray(history) && history.length > 0) {
    userHistoryText = history
      .filter((m) => {
        if ('role' in m) return m.role === 'user';
        if (typeof (m as any)._getType === 'function') return (m as any)._getType() === 'human';
        return false;
      })
      .slice(-3)
      .map((m) => {
        const c = 'content' in m ? m.content : '';
        return normalizeText(extractTextContent(c));
      })
      .join(' ');
  }

  // Combine user history ONLY if the current message contains symptom or progression cues.
  // Innocent questions ("what should I eat tonight?") do not drag old symptoms forward.
  const hasSymptomCueInCurrent =
    /\b(pain|cramp|bleed|blood|faint|worse|getting worse|more|still|hurt|headache|fever|nausea|kick|move|dizzy|discharge|pressure|swollen|pad|vomit|spotting|vision|water|break|leaking|belle|pikin)\b/i.test(normCurrent);

  const combinedUserText =
    hasSymptomCueInCurrent && userHistoryText
      ? `${userHistoryText} ${normCurrent}`
      : normCurrent;

  // 1. Mental Health & Self-Harm Escalation (Immediate safety alert)
  const mentalHealthEmergency = /\b(kill myself|suicide|end my life|want to die|harm myself|hurt my baby|hurt the baby|don't want to live|dont want to live)\b/i;
  if (mentalHealthEmergency.test(normCurrent)) {
    return {
      level: 'consult_doctor',
      emergencyCare: true,
      emergencyNumber: '112',
      suggestTelemedicine: false,
      warningNote:
        'If you are experiencing overwhelming distress, thoughts of self-harm, or feeling unsafe, please reach out for immediate help. Call emergency services (112 in Nigeria) or go to the nearest emergency room. You are not alone and support is available.',
    };
  }

  // 2. Determine Life-Stage Context
  const isPregnant =
    healthContext?.activeMode === 'pregnancy' ||
    Boolean(healthContext?.pregnancy) ||
    _extracted?.category === 'pregnancy' ||
    /\b(pregnant|pregnancy|weeks along|week \d+|trimester|fetal|baby('s)? kicks?|baby moving|positive test)\b/i.test(combinedUserText);

  const isPostmenopause =
    healthContext?.activeMode === 'postmenopause' ||
    Boolean(healthContext?.postmenopause) ||
    _extracted?.category === 'postmenopause' ||
    (Boolean(healthContext?.userAge) && healthContext!.userAge! >= 52) ||
    /\b(postmenopaus|menopaus|years without a period|years since last period)\b/i.test(combinedUserText);

  // 3. Pregnancy Acute Red Flags
  if (isPregnant) {
    // Specific obstetric bleeding pattern (ignores "blood pressure" / "blood test")
    const pregBleedPattern = /\b(vaginal bleed(?:ing)?|bleeding|spotting|haemorrhage|hemorrhage|blood in (?:my )?(?:underwear|pant(?:ie)?s|toilet|pad)|passed (?:a )?blood clot|brown discharge|blood clots?|blood dey comot|blood dey commot)\b/i;
    const hasBleeding = hasUnnegatedMatch(combinedUserText, pregBleedPattern);

    const severePainPattern = /\b(severe cramp|sharp pain|intense pain|excruciating|stabbing pain|unilateral pain|pain on one side|one-sided pain|severe pelvic pain|(?:belle|belly) dey pain me (?:die|well well|serious|bad bad))\b/i;
    const hasSeverePain = hasUnnegatedMatch(combinedUserText, severePainPattern);

    const movementPattern = /\b(can't feel the baby|cant feel the baby|haven't felt the baby|havent felt the baby|no kicks|stopped moving|not moving|reduced movement|no movement|baby hasn't moved|baby hasnt moved|pikin no dey move|pikin no dey kick)\b/i;
    const hasReducedMovement = movementPattern.test(combinedUserText);

    const preeclampsiaPattern =
      (/\b(blurry vision|flashing light|seeing spots|loss of vision|scotoma)\b/i.test(combinedUserText) &&
        /\b(headache|worst headache|migraine)\b/i.test(combinedUserText)) ||
      /\b(worst headache of my life|thunderclap headache)\b/i.test(combinedUserText) ||
      (/\b(swollen face|face is swollen|swelling in face)\b/i.test(combinedUserText) && /\b(headache|dizziness)\b/i.test(combinedUserText));

    const rupturePattern = /\b(water broke|water break|fluid leaking|leaking fluid|gush of fluid|water don break)\b/i;
    const hasRupturedMembranes = hasUnnegatedMatch(combinedUserText, rupturePattern);

    if (hasBleeding || hasSeverePain || hasReducedMovement || preeclampsiaPattern || hasRupturedMembranes) {
      return {
        level: 'consult_doctor',
        emergencyCare: true,
        emergencyNumber: '112',
        suggestTelemedicine: false,
        warningNote:
          'During pregnancy, vaginal bleeding, sharp or one-sided pelvic pain, decreased fetal movement, or vision changes require immediate in-person emergency evaluation. Please proceed to the nearest hospital emergency room or call 112 right away.',
      };
    }
  }

  // 4. Postmenopause Bleeding Red Flag
  if (isPostmenopause) {
    const postBleedPattern = /\b(vaginal bleed(?:ing)?|bleeding|blood in (?:underwear|pants|pad)|spotting|period started again|period returned|brown discharge)\b/i;
    const hasPostBleed = hasUnnegatedMatch(combinedUserText, postBleedPattern);

    if (hasPostBleed) {
      return {
        level: 'consult_doctor',
        emergencyCare: false,
        suggestTelemedicine: true,
        warningNote:
          'Any vaginal bleeding or spotting occurring after menopause must be promptly evaluated by a gynaecologist to rule out endometrial pathology. Please schedule a consultation with an OB-GYN.',
      };
    }
  }

  // 5. Universal Severe Acute Red Flags
  const acuteHemorrhage =
    hasUnnegatedMatch(
      combinedUserText,
      /\b(soaking through (?:a |two |2 )?pads?|pad every hour|soak(?:ed)? (?:a |two |2 )?pads? in an hour|two pads an hour|2 pads an hour|flooding through pads?|huge clots?|huge blood clots?)\b/i
    );

  const acuteSeverePain =
    hasUnnegatedMatch(
      combinedUserText,
      /\b(unbearable|severe pain|extreme pain|excruciating|cannot walk|can't walk|cannot stand|can't stand|worst pain)\b/i
    );

  const sepsisSigns =
    hasUnnegatedMatch(combinedUserText, /\b(fever|chills|rigors)\b/i) &&
    /\b(pelvic|cramp|period|abdomen|abdominal|foul smelling|foul-smelling)\b/i.test(combinedUserText);

  const syncopeSigns = hasUnnegatedMatch(combinedUserText, /\b(fainted|passed out|blacked out|collapsed|loss of consciousness)\b/i);

  const dvtSigns = hasUnnegatedMatch(combinedUserText, /\b(swollen leg|swollen calf|calf pain|calf redness|one leg swollen)\b/i);

  if (acuteHemorrhage || acuteSeverePain || sepsisSigns || syncopeSigns || dvtSigns) {
    return {
      level: 'consult_doctor',
      emergencyCare: true,
      emergencyNumber: '112',
      suggestTelemedicine: false,
      warningNote:
        'Your symptoms indicate acute severe hemorrhage, syncope, excruciating pain, or systemic distress that requires immediate emergency evaluation. Please visit the nearest emergency facility or call 112 immediately.',
    };
  }

  // 6. Monitor Level (Notable moderate symptoms)
  const moderatePattern = /\b(heavy flow|bad cramps|migraine|dizzy|nausea|burning urination|painful urination)\b/i;
  // If in pregnancy, simple nausea is common morning sickness (avoid constant alarming)
  const isJustMorningSickness = isPregnant && /\b(nausea|morning sickness)\b/i.test(normCurrent) && !/\b(can't keep water down|dehydrated|dizzy|fainted)\b/i.test(normCurrent);

  if (hasUnnegatedMatch(normCurrent, moderatePattern) && !isJustMorningSickness) {
    return {
      level: 'monitor',
      emergencyCare: false,
      suggestTelemedicine: false,
      warningNote: 'You have recorded notable symptoms. Keep hydrated, rest, and monitor your comfort. If symptoms intensify, reach out to a healthcare provider.',
    };
  }

  return {
    level: 'normal',
    suggestTelemedicine: false,
    emergencyCare: false,
  };
}

/**
 * Builds user context string for LLM prompting WITHOUT fabricated defaults
 */
export function formatHealthSummary(context?: HealthContext): string {
  if (!context) return "Life Stage: Comprehensive Women's Health & Reproductive Wellness.";

  const parts: string[] = [];
  if (context.userName) parts.push(`User Name: ${context.userName}`);
  if (context.userAge) parts.push(`Age: ${context.userAge}`);

  if (context.activeTopicFocus && context.activeTopicFocus !== 'all') {
    parts.push(`Current Topic Focus: ${context.activeTopicFocus.toUpperCase()}`);
  }

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
  if (context.medicalProfile?.medications?.length) {
    parts.push(`Current Medications: ${context.medicalProfile.medications.join(', ')}`);
  }
  if (context.medicalProfile?.allergies?.length) {
    parts.push(`Allergies: ${context.medicalProfile.allergies.join(', ')}`);
  }
  if (context.medicalProfile?.notes) {
    parts.push(`Health Profile Notes: ${context.medicalProfile.notes}`);
  }

  if (context.appointments && context.appointments.length > 0) {
    const appts = context.appointments.slice(0, 3).map((a) => {
      const doc = a.doctorName || 'Specialist';
      const spec = a.doctorSpecialty || 'OB-GYN';
      let time = a.scheduledTime || 'Upcoming';
      if (time && time !== 'Upcoming') {
        const d = new Date(time);
        if (!isNaN(d.getTime())) {
          time = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      }
      return `${doc} (${spec}, ${time}, ${a.status || 'confirmed'})`;
    }).join('; ');
    parts.push(`Booked Doctor Consultations: ${appts}`);
  }

  if (context.activeMode === 'pregnancy' || context.pregnancy) {
    const p = context.pregnancy;
    const pregDetails: string[] = [];
    if (p?.currentWeek) {
      pregDetails.push(`Gestational Week ${p.currentWeek}`);
      const trimester = p.trimester || (p.currentWeek <= 12 ? 1 : p.currentWeek <= 27 ? 2 : 3);
      pregDetails.push(`Trimester ${trimester}`);
    } else {
      pregDetails.push('Gestational Week: Unknown');
    }
    if (p?.dueDate) pregDetails.push(`Due Date: ${p.dueDate}`);
    if (p?.babySize) pregDetails.push(`Baby Size Analogy: ${p.babySize}`);
    if (p?.kickCountToday !== undefined) pregDetails.push(`Kicks Today: ${p.kickCountToday}`);

    parts.push(`Pregnancy: ${pregDetails.join(', ')}`);
  }

  if (context.activeMode === 'postmenopause' || context.postmenopause) {
    const stage = context.postmenopause?.stage || 'Postmenopause';
    const hrt = context.postmenopause?.onHrt ? ' (HRT Active)' : '';
    const flashes = context.postmenopause?.hotFlashesPerDay !== undefined ? `, Hot Flashes/Day: ${context.postmenopause.hotFlashesPerDay}` : '';
    parts.push(`Menopause Stage: ${stage}${hrt}${flashes}`);
  }

  if (context.cycle || context.currentCycleDay || context.activeMode === 'cycle') {
    const c = context.cycle;
    const day = c?.currentCycleDay || context.currentCycleDay;
    const len = c?.cycleLength || context.cycleLength;
    const phase = c?.phaseName || context.phaseName;
    const nextPeriod = c?.nextPeriodDate || context.nextPeriodDate;

    const cycleParts: string[] = [];
    if (day && len) cycleParts.push(`Day ${day} of ${len}`);
    else if (day) cycleParts.push(`Day ${day}`);
    else cycleParts.push('Day: Not logged');

    if (phase) cycleParts.push(`Phase: ${phase}`);
    if (nextPeriod) cycleParts.push(`Next Period: ${nextPeriod}`);

    parts.push(`Menstrual Cycle: ${cycleParts.join(', ')}`);
  }

  return parts.length > 0 ? parts.join(' | ') : "Comprehensive Women's Health & Reproductive Wellness.";
}

/**
 * Returns dynamic, actionable quick replies based on triage severity and life stage.
 */
export function getSuggestedQuickReplies(healthContext?: HealthContext, triage?: TriageResult): string[] {
  if (triage?.emergencyCare) {
    return [
      'Call Emergency (112)',
      'Find nearest emergency hospital',
      'What should someone do while waiting for help?',
    ];
  }

  if (triage?.level === 'consult_doctor') {
    return [
      'Book an OB-GYN consultation',
      'What symptoms should I monitor?',
      'How to prepare for my doctor appointment',
    ];
  }

  if (triage?.level === 'monitor') {
    return [
      'What natural remedies help comfort this?',
      'When should I contact a doctor?',
      'Log my symptoms in the tracker',
    ];
  }

  const mode = healthContext?.activeMode || 'general';
  if (mode === 'pregnancy') {
    return [
      'How big is my baby this week?',
      'Safe prenatal nutrition tips',
      'When should I schedule an ultrasound?',
    ];
  } else if (mode === 'postmenopause') {
    return [
      'How to reduce severe hot flashes?',
      'Is HRT safe for me?',
      'Best supplements for bone density',
    ];
  } else if (mode === 'cycle') {
    return [
      'When is my fertile window?',
      'What natural remedies help cramps?',
      'Hormonal shifts in this phase',
    ];
  } else {
    return [
      'Birth control methods comparison',
      'PCOS vs Endometriosis differences',
      'Consult an OB-GYN on Telemedicine',
    ];
  }
}

/**
 * Shared System Prompt Builder
 */
export function buildSystemPrompt(healthContext?: HealthContext, triage?: TriageResult, channel: 'text' | 'voice' = 'text'): SystemMessage {
  const healthSummary = formatHealthSummary(healthContext);

  let clinicalDirective = '';
  if (triage?.emergencyCare) {
    clinicalDirective = `
🚨 MANDATORY EMERGENCY OVERRIDE 🚨
The user is experiencing an acute medical emergency.
1. ZERO CASUAL REASSURANCE: DO NOT say "Aww babe", "don't worry 💕", "Relax", or "Take a deep breath".
2. FIRM EMERGENCY DIRECTIVE: Instruct her directly to go to the nearest hospital emergency room or call emergency services (112 in Nigeria) immediately.
3. NO DELAY: Do NOT suggest a scheduled telemedicine appointment. Urgent in-person evaluation is required.`;
  } else if (triage?.level === 'consult_doctor') {
    clinicalDirective = `
🚨 CLINICAL CONSULTATION DIRECTIVE 🚨
The user has reported symptoms requiring prompt medical evaluation.
1. NO MINIMIZATION: Acknowledge her symptoms seriously and empathetically.
2. URGE SPECIALIST CARE: Advise her to consult an OB-GYN or doctor promptly. You may suggest booking a verified specialist through the telemedicine tab in the app.`;
  } else if (triage?.level === 'monitor') {
    clinicalDirective = `
⚠️ CLINICAL MONITORING DIRECTIVE:
Suggest gentle supportive comfort measures. Remind her to track her symptoms and consult a doctor if discomfort intensifies.`;
  } else {
    clinicalDirective = `
STANDARD CARE DIRECTIVE:
Provide warm, evidence-based reproductive wellness support. Ask at most one clarifying question if helpful.`;
  }

  const voiceRule = channel === 'voice'
    ? '\nVOICE CALL MODE: You are Dr. Red, a warm, grounded health companion. Answer the user’s latest spoken request directly and stay on that topic. Use recent conversation only when it clearly helps. Interpret short replies like “yes” using the immediately preceding exchange; if the reference is unclear, ask one brief question instead of guessing. Sound like a thoughtful person speaking naturally: use contractions, varied sentence rhythm, and specific empathy. Avoid canned openings, exaggerated sympathy, pet names, repeated reassurances, and filler. Finish the thought before asking a question. Keep each reply to 1–3 short, complete sentences unless the user asks for detail. No emojis, markdown, or bullet lists.'
    : '';
  const toolUsageDirectives = channel === 'voice'
    ? `VOICE TOOL USAGE DIRECTIVES:
You have one available tool: consult_red_apple_agent. Call it before answering health questions, discussing symptoms or a diagnosis, giving health advice, using the user's health history, or performing an app action. Include the user's full request and relevant context in the tool request. Use its result to answer clearly and directly. Never claim an action succeeded unless the tool result confirms it. You may answer greetings and emotional-support statements directly. If the tool fails or lacks information, say so plainly and ask a focused follow-up rather than inventing details.`
    : `TOOL USAGE DIRECTIVES:
You have direct access to database tools. When appropriate, invoke the tool first rather than pretending or just stating you performed an action:
1. log_symptoms: Call this function whenever the user asks to log/record symptoms, cramps, bleeding, flow intensity, mood, or reports feeling unwell today. Never say you logged them without invoking this tool.
2. find_available_doctors: Call this function when the user asks to find, list, see, or consult doctors, specialists, or OB-GYNs.
3. get_cycle_history: Call this function when the user asks about their previous cycles, past period dates, or logged history.
4. set_reminder: Call this function when the user asks to schedule a reminder or health check-in.
5. book_consultation: When the user confirms or asks to book an appointment (e.g. says "Yes", "Confirm", "Book it", "Go ahead"), invoke book_consultation with confirmed: true, doctorId, and scheduledTime. Once confirmed by the tool, warmly reassure her that she is booked!`;

  return new SystemMessage(
    `You are Dr. Red, a knowledgeable, compassionate reproductive health companion in the Red Apple health app.
You explain female physiology, menstrual cycles, pregnancy, menopause, and wellness clearly, without pretending to be a human clinician.

CONVERSATION RULES:
1. NATURAL & SPOKEN: Sound warm, calm, and present. Use everyday language and complete thoughts. Never lecture or write long essays.
2. ONE QUESTION AT A TIME: Ask at most ONE clarifying question per turn, only if the answer changes your clinical recommendation.
3. HONEST ACTIONS: When you use a tool, summarize what you did only after the tool executes. Never claim an action succeeded unless the tool confirms it.
4. ZERO INTRO SLOP: NEVER say "Hi, I am [name]", "I am your AI companion...", "As an AI...", or robotic greetings. Jump straight into speaking to her warmly.
${voiceRule}

${toolUsageDirectives}

${clinicalDirective}

User Health Profile & Context:
${healthSummary}`
  );
}

// Module-level cached graph
let _cachedHealthGraph: any = null;

/**
 * Condition determining whether the agent node requested tool calls
 */
export function toolsCondition(state: any): string {
  const message = Array.isArray(state) ? state[state.length - 1] : state.messages[state.messages.length - 1];
  if (message && 'tool_calls' in message && (message.tool_calls?.length ?? 0) > 0) {
    return 'tools';
  }
  return END;
}

/**
 * Constructs and returns the LangGraph Agent Graph (Compiled once as module singleton)
 * Architecture:
 * START -> triageNode -> (emergencyCare ? emergencyNode : agentNode)
 * agentNode -> toolsCondition -> (tools: toolsNode, END: safetyNode)
 * toolsNode -> agentNode
 * safetyNode -> END
 */
export function buildHealthAgentGraph() {
  if (_cachedHealthGraph) {
    return _cachedHealthGraph;
  }

  const workflow = new StateGraph(AgentStateAnnotation)
    // 1. Triage Node (Runs FIRST to evaluate clinical risk and route)
    .addNode('triageNode', async (state) => {
      const lastUserMsg = extractTextContent(state.messages[state.messages.length - 1]?.content);
      const triage = evaluateTriage(lastUserMsg, state.extractedLog, state.healthContext, state.messages);
      const quickReplies = getSuggestedQuickReplies(state.healthContext, triage);

      return {
        triage,
        suggestedQuickReplies: quickReplies,
      };
    })

    // 2. Emergency Node (Pre-templated immediate safety response; zero LLM dependency)
    .addNode('emergencyNode', async (state) => {
      const reply = buildEmergencyReply(state.triage, state.healthContext);
      return {
        messages: [new AIMessage(reply)],
        reply,
        isAiGenerated: false,
      };
    })

    // 3. Agent Node (LLM with tools bound for ReAct reasoning loop)
    .addNode('agentNode', async (state, cfg) => {
      const apiKey = config.gemini.apiKey;
      if (!apiKey || apiKey.trim().length === 0) {
        // Fallback when LLM is unavailable
        const fallbackText = state.triage.warningNote || "I'm right here with you sis. There was a temporary connection glitch, but please let me know how you're feeling.";
        return {
          messages: [new AIMessage(fallbackText)],
          reply: fallbackText,
          isAiGenerated: false,
        };
      }

      try {
        const systemPrompt = buildSystemPrompt(state.healthContext, state.triage, state.channel);
        const model = createChatModel(apiKey).bindTools(agentTools);

        const recentMessages = state.messages.slice(-14);
        const result = await model.invoke([systemPrompt, ...recentMessages], cfg);

        return {
          messages: [result],
          reply: extractTextContent(result.content),
          isAiGenerated: true,
        };
      } catch (error) {
        console.warn('[LangGraph] Agent invocation error:', error);
        const fallbackReply = state.triage.warningNote || "There was a problem connecting to the AI. Please try again.";
        return {
          messages: [new AIMessage(fallbackReply)],
          reply: fallbackReply,
          isAiGenerated: false,
        };
      }
    })

    // 4. Tools Node (Executes ReAct tool calls directly)
    .addNode('tools', async (state, cfg) => {
      const lastMessage = state.messages[state.messages.length - 1] as any;
      const toolCalls = lastMessage?.tool_calls || [];
      const results: BaseMessage[] = [];
      const actions: AgentToolAction[] = [];

      for (const tc of toolCalls) {
        const matchedTool = agentTools.find((t) => t.name === tc.name);
        let output = '';
        let parsedResult: any = null;
        if (matchedTool) {
          try {
            output = await (matchedTool as any).invoke(tc.args, cfg);
            try {
              parsedResult = JSON.parse(output);
            } catch {
              parsedResult = output;
            }
          } catch (err: any) {
            output = JSON.stringify({ error: err.message || 'Tool execution failed' });
            parsedResult = { error: err.message || 'Tool execution failed' };
          }
        } else {
          output = JSON.stringify({ error: `Tool ${tc.name} not found` });
          parsedResult = { error: `Tool ${tc.name} not found` };
        }
        actions.push({ id: tc.id, tool: tc.name, args: tc.args, result: parsedResult });
        results.push(new ToolMessage({ content: output, tool_call_id: tc.id, name: tc.name }));
      }

      return {
        messages: results,
        toolActions: actions,
      };
    })

    // 5. Safety Node (Guarantees generated text contains medical guidance if triage is escalated)
    .addNode('safetyNode', async (state) => {
      const last = state.messages[state.messages.length - 1];
      const text = extractTextContent(last?.content);
      const needsDoctor = state.triage.level === 'consult_doctor' || state.triage.emergencyCare;
      const mentionsCare = /\b(doctor|ob-?gyn|clinic|hospital|emergency|112|physician|healthcare provider|seek care)\b/i.test(text);

      let finalReply = text || state.reply || '';
      if (needsDoctor && !mentionsCare && state.triage.warningNote) {
        finalReply = `${finalReply}\n\n⚠️ ${state.triage.warningNote}`.trim();
        return {
          messages: [new AIMessage(finalReply)],
          reply: finalReply,
        };
      }

      return {
        reply: finalReply,
      };
    })

    // Graph Edge Wiring
    .addEdge(START, 'triageNode')
    .addConditionalEdges('triageNode', (s) => (s.triage.emergencyCare ? 'emergencyNode' : 'agentNode'), {
      emergencyNode: 'emergencyNode',
      agentNode: 'agentNode',
    })
    .addEdge('emergencyNode', END)
    .addConditionalEdges('agentNode', toolsCondition, { tools: 'tools', [END]: 'safetyNode' })
    .addEdge('tools', 'agentNode')
    .addEdge('safetyNode', END);

  _cachedHealthGraph = workflow.compile();
  return _cachedHealthGraph;
}

/**
 * Public agent runner function (Non-streaming path)
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

  const configParams = {
    configurable: {
      userId: healthContext?.userId || 'anonymous_user',
    },
  };

  const result = await graph.invoke(
    {
      messages,
      healthContext,
      channel: (healthContext as any)?.channel || 'text',
    },
    configParams
  );

  return {
    reply: result.reply,
    extractedLog: result.extractedLog,
    triage: result.triage,
    suggestedQuickReplies: result.suggestedQuickReplies,
    toolActions: result.toolActions || [],
    isAiGenerated: result.isAiGenerated,
  };
}

export type StreamAgentEvent =
  | { type: 'chunk'; content: string }
  | { type: 'meta'; triage: TriageResult; suggestedQuickReplies: string[] }
  | { type: 'tool_action'; action: AgentToolAction }
  | { type: 'done'; toolActions?: AgentToolAction[] };

/**
 * Real-time Streaming Health Agent (Unified with Immediate Meta Event & Offline Safety Fallback)
 */
export async function* streamHealthAgent(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  healthContext?: HealthContext
): AsyncGenerator<StreamAgentEvent> {
  // 1. Triage runs FIRST!
  const triage = evaluateTriage(userMessage, undefined, healthContext, history);
  const quickReplies = getSuggestedQuickReplies(healthContext, triage);

  // 2. Yield metadata IMMEDIATELY so client displays advisory banner before token streaming begins
  yield {
    type: 'meta',
    triage,
    suggestedQuickReplies: quickReplies,
  };

  // 3. If Acute Emergency: stream hand-written emergency reply directly (zero LLM dependency)
  if (triage.emergencyCare) {
    const emergencyText = buildEmergencyReply(triage, healthContext);
    yield { type: 'chunk', content: emergencyText };
    yield { type: 'done', toolActions: [] };
    return;
  }

  // 4. If Google Gemini API key is missing, return safe fallback
  const apiKey = config.gemini.apiKey;
  if (!apiKey || apiKey.trim().length === 0) {
    const fallbackText = triage.warningNote || "There was a problem connecting to the AI. Please try again.";
    yield { type: 'chunk', content: fallbackText };
    yield { type: 'done', toolActions: [] };
    return;
  }

  try {
    const channelMode = (healthContext as any)?.channel === 'voice' ? 'voice' : 'text';
    const systemPrompt = buildSystemPrompt(healthContext, triage, channelMode);
    const modelWithTools = createChatModel(apiKey).bindTools(agentTools);

    const messages: BaseMessage[] = history.map((msg) =>
      msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
    );
    messages.push(new HumanMessage(userMessage));

    const configParams = {
      configurable: {
        userId: healthContext?.userId || 'anonymous_user',
      },
    };

    const recent = messages.slice(-14);
    const initialResponse = await modelWithTools.invoke([systemPrompt, ...recent], configParams);

    const executedActions: AgentToolAction[] = [];
    const toolCalls = (initialResponse as any).tool_calls || [];

    if (toolCalls.length > 0) {
      const toolMessages: ToolMessage[] = [];

      for (const tc of toolCalls) {
        const matchedTool = agentTools.find((t) => t.name === tc.name);
        let rawOutput = '';
        let parsedResult: any = null;

        if (matchedTool) {
          try {
            rawOutput = await (matchedTool as any).invoke(tc.args, configParams);
            try {
              parsedResult = JSON.parse(rawOutput);
            } catch {
              parsedResult = rawOutput;
            }
          } catch (err: any) {
            rawOutput = JSON.stringify({ error: err.message || 'Tool execution failed' });
            parsedResult = { error: err.message || 'Tool execution failed' };
          }
        } else {
          rawOutput = JSON.stringify({ error: `Tool ${tc.name} not found` });
          parsedResult = { error: `Tool ${tc.name} not found` };
        }

        const action: AgentToolAction = {
          id: tc.id,
          tool: tc.name,
          args: tc.args,
          result: parsedResult,
        };
        executedActions.push(action);
        yield { type: 'tool_action', action };

        toolMessages.push(new ToolMessage({ content: rawOutput, tool_call_id: tc.id, name: tc.name }));
      }

      // Stream the follow-up conversational conclusion referencing tool execution
      const followUpModel = createChatModel(apiKey);
      const stream = await followUpModel.stream([
        systemPrompt,
        ...recent,
        initialResponse,
        ...toolMessages,
      ]);

      let accumulated = '';
      for await (const chunk of stream) {
        const text = extractTextContent(chunk.content);
        if (text) {
          accumulated += text;
          yield { type: 'chunk', content: text };
        }
      }

      // Guardrail validation: if escalated triage, ensure medical direction was given
      if (triage.level === 'consult_doctor') {
        const mentionsCare = /\b(doctor|ob-?gyn|clinic|hospital|emergency|112|physician|healthcare provider|seek care)\b/i.test(accumulated);
        if (!mentionsCare && triage.warningNote) {
          yield { type: 'chunk', content: `\n\n⚠️ ${triage.warningNote}` };
        }
      }

      yield { type: 'done', toolActions: executedActions };
    } else {
      // No tools called: stream initialResponse content smoothly
      const replyText = extractTextContent(initialResponse.content);
      if (replyText) {
        // Chunk into natural words/phrases for smooth streaming rendering
        const words = replyText.split(/(\s+)/);
        for (let i = 0; i < words.length; i += 4) {
          const phrase = words.slice(i, i + 4).join('');
          if (phrase) {
            yield { type: 'chunk', content: phrase };
          }
        }
      }

      // Guardrail validation: if escalated triage, ensure medical direction was given
      if (triage.level === 'consult_doctor') {
        const mentionsCare = /\b(doctor|ob-?gyn|clinic|hospital|emergency|112|physician|healthcare provider|seek care)\b/i.test(replyText);
        if (!mentionsCare && triage.warningNote) {
          yield { type: 'chunk', content: `\n\n⚠️ ${triage.warningNote}` };
        }
      }

      yield { type: 'done', toolActions: [] };
    }
  } catch (streamErr: any) {
    const isRateLimit = streamErr?.status === 429 || /quota|rate limit|429/i.test(streamErr?.message || '');
    if (isRateLimit) {
      console.warn('[streamHealthAgent] Gemini rate limit reached (429). Delivering safe medical triage fallback.');
    } else {
      console.warn('[streamHealthAgent] Streaming error:', streamErr?.message || streamErr);
    }
    // Safety text guaranteed even on stream failure!
    const fallback = triage.warningNote || (isRateLimit
      ? "Our health AI is experiencing high demand right now, sis. If you are experiencing concerning symptoms, please speak with an OB-GYN or visit the nearest clinic."
      : "I'm having trouble reaching the service, sis. Please check in with a doctor if you feel unwell.");
    yield { type: 'chunk', content: fallback };
    yield { type: 'done', toolActions: [] };
  }
}
