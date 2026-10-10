import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { runHealthAgent, streamHealthAgent, HealthContext, DoctorBookingSummary } from '../services/aiAgent.service';
import { telemedicineStore } from '../data/telemedicine.store';
import { userStore } from '../data/user.store';
import { config } from '../config';

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
      try {
        const [bookings, fullUser] = await Promise.all([
          telemedicineStore.getUserBookings(req.user.userId),
          userStore.findById(req.user.userId),
        ]);

        if (!resolvedContext.userName && fullUser?.name) {
          resolvedContext.userName = fullUser.name;
        }

        if (!resolvedContext.medicalProfile && fullUser?.health_profile) {
          resolvedContext.medicalProfile = {
            reproductiveGoal: fullUser.health_profile.reproductiveGoal,
            notes: fullUser.health_profile.notes,
          };
        }

        if ((!resolvedContext.appointments || resolvedContext.appointments.length === 0) && bookings?.length) {
          resolvedContext.appointments = bookings.slice(0, 3).map((b): DoctorBookingSummary => ({
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
      try {
        const [bookings, fullUser] = await Promise.all([
          telemedicineStore.getUserBookings(req.user.userId),
          userStore.findById(req.user.userId),
        ]);

        if (!resolvedContext.userName && fullUser?.name) {
          resolvedContext.userName = fullUser.name;
        }

        if (!resolvedContext.medicalProfile && fullUser?.health_profile) {
          resolvedContext.medicalProfile = {
            reproductiveGoal: fullUser.health_profile.reproductiveGoal,
            notes: fullUser.health_profile.notes,
          };
        }

        if ((!resolvedContext.appointments || resolvedContext.appointments.length === 0) && bookings?.length) {
          resolvedContext.appointments = bookings.slice(0, 3).map((b): DoctorBookingSummary => ({
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
        if (event.type === 'chunk') {
          res.write(`data: ${JSON.stringify({ chunk: event.content })}\n\n`);
        } else if (event.type === 'meta') {
          res.write(`data: ${JSON.stringify({ done: true, triage: event.triage, suggestedQuickReplies: event.suggestedQuickReplies })}\n\n`);
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
      model: 'gemini-2.5-flash',
    });
  } catch (error) {
    next(error);
  }
}
