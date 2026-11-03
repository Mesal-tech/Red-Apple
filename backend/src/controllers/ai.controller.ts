import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { runHealthAgent, streamHealthAgent, buildSystemPrompt, HealthContext, DoctorBookingSummary } from '../services/aiAgent.service';
import { telemedicineStore } from '../data/telemedicine.store';
import { userStore } from '../data/user.store';
import { config } from '../config';
import { createLiveVoiceTicket } from '../services/liveVoiceTickets.service';

function toShortText(value: unknown, maxLength = 240): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLength) : '';
}

function voiceProfileContext(input: any) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const list = (value: unknown) => Array.isArray(value)
    ? value.slice(0, 8).map((entry) => toShortText(entry, 100)).filter(Boolean)
    : [];
  const cycle = input.cycle && typeof input.cycle === 'object' ? input.cycle : {};
  const medical = input.medicalProfile && typeof input.medicalProfile === 'object' ? input.medicalProfile : {};
  const pregnancy = input.pregnancy && typeof input.pregnancy === 'object' ? input.pregnancy : {};
  const numberOrUndefined = (value: unknown) => value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : undefined;

  return {
    userName: toShortText(input.userName, 60),
    activeMode: toShortText(input.activeMode, 40),
    cycle: {
      currentCycleDay: numberOrUndefined(cycle.currentCycleDay),
      cycleLength: numberOrUndefined(cycle.cycleLength),
      phaseName: toShortText(cycle.phaseName, 60),
      nextPeriodDate: toShortText(cycle.nextPeriodDate, 40),
      ovulationDate: toShortText(cycle.ovulationDate, 40),
    },
    pregnancy: {
      week: numberOrUndefined(pregnancy.week ?? pregnancy.currentWeek),
      dueDate: toShortText(pregnancy.dueDate, 40),
    },
    medicalProfile: {
      reproductiveGoal: toShortText(medical.reproductiveGoal, 100),
      knownConditions: list(medical.knownConditions || medical.conditions),
      medications: list(medical.medications),
      allergies: list(medical.allergies),
      notes: toShortText(medical.notes, 800),
    },
  };
}

export async function createRealtimeVoiceSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, error: 'Sign in to start a voice session.' });
    }
    if (!config.gemini.apiKey.trim()) {
      return res.status(503).json({ success: false, error: 'Gemini voice is not configured on the server.' });
    }

    let context: HealthContext = voiceProfileContext(req.body?.healthContext) as HealthContext;
    context = await enrichHealthContext(req.user.userId, context);
    context.userId = req.user.userId;
    (context as any).channel = 'voice';

    const recentChat = Array.isArray(req.body?.recentChat)
      ? req.body.recentChat.slice(-8).map((message: any) => ({
        role: message?.role === 'assistant' ? 'assistant' : 'user',
        content: toShortText(message?.content, 600),
      })).filter((message: any) => message.content)
      : [];
    const recentConversation = recentChat.map((message: any) =>
      `${message.role === 'assistant' ? 'Dr. Red' : 'User'}: ${message.content}`
    ).join('\n');
    const systemMessage = buildSystemPrompt(context, undefined, 'voice');
    const systemText = typeof systemMessage.content === 'string'
      ? systemMessage.content
      : Array.isArray(systemMessage.content)
        ? systemMessage.content.map((part: any) => typeof part === 'string' ? part : part?.text || '').join('\n')
        : '';
    const useAzureSpeech = Boolean(config.azureSpeech.key.trim() && config.azureSpeech.region.trim());
    const uninterruptedMode = req.body?.uninterruptedMode === true;
    const setup = {
      model: 'models/gemini-3.8-live',
      ...(uninterruptedMode ? { activityHandling: 'NO_INTERRUPTION' } : {}),
      generationConfig: {
        responseModalities: [useAzureSpeech ? 'TEXT' : 'AUDIO'],
        ...(useAzureSpeech ? {} : { speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } } }),
      },
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: uninterruptedMode,
          endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
          prefixPaddingMs: 250,
          silenceDurationMs: 1600,
        },
      },
      systemInstruction: {
        parts: [{ text: `${systemText}\n\nUser profile context: ${JSON.stringify(context).slice(0, 5000)}\nRecent conversation for context only (answer the user's latest request):\n${recentConversation.slice(0, 5000)}` }],
      },
      inputAudioTranscription: {},
      ...(useAzureSpeech ? {} : { outputAudioTranscription: {} }),
      tools: [{ functionDeclarations: [{
        name: 'consult_red_apple_agent',
        description: 'Use Red Apple health tools to answer questions about the user profile, health history, symptom logging, and app actions.',
        parameters: {
          type: 'OBJECT',
          properties: { request: { type: 'STRING', description: 'The health or app action request to handle.' } },
          required: ['request'],
        },
      }] }],
    };
    const { ticket, expiresAt } = createLiveVoiceTicket(req.user.userId, setup);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      data: {
        ticket,
        expiresAt,
        speechProvider: useAzureSpeech ? 'azure' : 'gemini',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function synthesizeRealtimeVoice(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, error: 'Sign in to use Dr. Red voice.' });
    }
    if (!config.azureSpeech.key.trim() || !config.azureSpeech.region.trim()) {
      return res.status(503).json({ success: false, error: 'Dr. Red Nigerian voice is not configured on the server.' });
    }

    const text = toShortText(req.body?.text, 1200);
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required for speech.' });
    }
    const region = config.azureSpeech.region.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(region)) {
      return res.status(500).json({ success: false, error: 'Azure Speech region is invalid.' });
    }
    const xmlEscape = (value: string) => value.replace(/[<>&"']/g, (char) => ({
      '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
    }[char] || char));
    const ssml = `<speak version="1.0" xml:lang="en-NG"><voice name="${xmlEscape(config.azureSpeech.voice)}"><prosody rate="0%" pitch="0%">${xmlEscape(text)}</prosody></voice></speak>`;
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 20000);
    try {
      const upstream = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': config.azureSpeech.key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'raw-24khz-16bit-mono-pcm',
          'User-Agent': 'RedApple',
        },
        body: ssml,
        signal: abortController.signal,
      });
      if (!upstream.ok) {
        console.warn('[VoiceTTS] Azure Speech rejected synthesis:', upstream.status);
        return res.status(upstream.status === 429 ? 429 : 502).json({ success: false, error: 'Dr. Red could not synthesize speech right now.' });
      }
      const audio = Buffer.from(await upstream.arrayBuffer());
      if (!audio.length) {
        return res.status(502).json({ success: false, error: 'Dr. Red received an empty speech response.' });
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ success: true, data: { audio: audio.toString('base64'), sampleRate: 24000 } });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    next(error);
  }
}

export async function runRealtimeVoiceTool(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, error: 'Sign in to use voice actions.' });
    }
    const request = toShortText(req.body?.request, 1800);
    if (!request) {
      return res.status(400).json({ success: false, error: 'A voice action request is required.' });
    }

    let resolvedContext: HealthContext = voiceProfileContext(req.body?.healthContext) as HealthContext;
    resolvedContext = await enrichHealthContext(req.user.userId, resolvedContext);
    resolvedContext.userId = req.user.userId;
    (resolvedContext as any).channel = 'voice';

    const result = await runHealthAgent(request, [], resolvedContext);
    if (!result?.isAiGenerated || !result.reply?.trim()) {
      return res.status(502).json({ success: false, error: 'The health assistant could not complete that action.' });
    }
    return res.status(200).json({
      success: true,
      data: {
        reply: result.reply,
        triage: result.triage,
        toolActions: result.toolActions || [],
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function chatWithHealthAgent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { message, history, healthContext, cycleContext, stream } = req.body;

    if (stream === true || req.query.stream === 'true') {
      return chatWithHealthAgentStream(req, res, next);
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'A valid message string is required.',
      });
    }

    let resolvedContext: HealthContext = {
      ...((healthContext || cycleContext) as HealthContext || {}),
    };

    // If authenticated, enrich context with live backend data if missing
    if (req.user?.userId) {
      resolvedContext = await enrichHealthContext(req.user.userId, resolvedContext);
      resolvedContext.userId = req.user.userId;
    }

    const agentResult = await runHealthAgent(
      message,
      Array.isArray(history) ? history : [],
      resolvedContext
    );

    if (!agentResult.isAiGenerated || !agentResult.reply || agentResult.reply.trim().length === 0) {
      return res.status(503).json({
        success: false,
        error: 'There was a problem connecting to the AI. Please try again.',
      });
    }

    return res.status(200).json({
      success: true,
      data: agentResult,
    });
  } catch (error) {
    next(error);
  }
}

async function enrichHealthContext(userId: string, baseContext: HealthContext): Promise<HealthContext> {
  const context: HealthContext = { ...baseContext };
  try {
    const [bookings, fullUser] = await Promise.all([
      telemedicineStore.getUserBookings(userId),
      userStore.findById(userId),
    ]);

    if (!context.userName && fullUser?.name) {
      context.userName = fullUser.name;
    }

    if (!context.userAge && fullUser?.date_of_birth) {
      try {
        const dob = new Date(fullUser.date_of_birth);
        if (!isNaN(dob.getTime())) {
          const diffMs = Date.now() - dob.getTime();
          const ageDate = new Date(diffMs);
          context.userAge = Math.abs(ageDate.getUTCFullYear() - 1970);
        }
      } catch {}
    }

    if (fullUser?.health_profile) {
      const hp = fullUser.health_profile as any;
      context.medicalProfile = {
        reproductiveGoal: context.medicalProfile?.reproductiveGoal || hp.reproductiveGoal,
        birthControl: context.medicalProfile?.birthControl || hp.birthControl,
        knownConditions: context.medicalProfile?.knownConditions || (Array.isArray(hp.knownConditions) ? hp.knownConditions : []),
        medications: context.medicalProfile?.medications || (Array.isArray(hp.medications) ? hp.medications : []),
        allergies: context.medicalProfile?.allergies || (Array.isArray(hp.allergies) ? hp.allergies : []),
        notes: context.medicalProfile?.notes || hp.notes,
      };
    }

    if ((!context.appointments || context.appointments.length === 0) && bookings?.length) {
      context.appointments = bookings.slice(0, 3).map((b): DoctorBookingSummary => ({
        id: b.booking_id,
        doctorId: b.doctor_id,
        doctorName: b.doctor_name,
        doctorSpecialty: b.doctor_specialty,
        scheduledTime: b.scheduled_time,
        consultationType: b.consultation_type,
        status: b.status,
        reason: b.reason,
      }));
    }
  } catch (storeErr) {
    console.warn('[ai.controller] Non-fatal data enrichment error:', storeErr);
  }
  return context;
}

export async function chatWithHealthAgentStream(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { message, history, healthContext, cycleContext } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'A valid message string is required.',
      });
    }

    let resolvedContext: HealthContext = {
      ...((healthContext || cycleContext) as HealthContext || {}),
    };

    if (req.user?.userId) {
      resolvedContext = await enrichHealthContext(req.user.userId, resolvedContext);
      resolvedContext.userId = req.user.userId;
    }

    // Set SSE headers for real-time streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    try {
      for await (const event of streamHealthAgent(
        message,
        Array.isArray(history) ? history : [],
        resolvedContext
      )) {
        if (event.type === 'meta') {
          res.write(`data: ${JSON.stringify({ triage: event.triage, suggestedQuickReplies: event.suggestedQuickReplies })}\n\n`);
        } else if (event.type === 'tool_action') {
          res.write(`data: ${JSON.stringify({ tool_action: event.action })}\n\n`);
        } else if (event.type === 'chunk') {
          res.write(`data: ${JSON.stringify({ chunk: event.content })}\n\n`);
        } else if (event.type === 'done') {
          res.write(`data: ${JSON.stringify({ done: true, toolActions: event.toolActions || [] })}\n\n`);
        }
      }
      res.end();
    } catch (streamErr: any) {
      console.error('[ai.controller] Stream error:', streamErr);
      res.write(`data: ${JSON.stringify({ error: 'There was a problem connecting to the AI. Please try again.' })}\n\n`);
      res.end();
    }
  } catch (error) {
    next(error);
  }
}

export async function getAiStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const hasKey = Boolean(config.gemini.apiKey && config.gemini.apiKey.trim().length > 0);
    return res.status(200).json({
      status: 'active',
      provider: 'Google Gemini & LangGraph',
      hasApiKeyConfigured: hasKey,
      model: config.gemini.model || 'gemini-flash-lite-latest',
    });
  } catch (error) {
    next(error);
  }
}
