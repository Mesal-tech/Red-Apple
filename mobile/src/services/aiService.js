import { apiRequest, getBaseApiUrl } from './apiClient';
import { getAuthSessionSafe } from '../utils/storage';

/**
 * AI Health Companion Service
 * Communicates with Red Apple's LangGraph & Gemini 2.5 backend with real-time SSE streaming.
 */
class AIService {
  /**
   * Checks the AI agent status and backend availability
   */
  async getStatus() {
    try {
      const res = await apiRequest('/ai/status', { method: 'GET' }, 3000);
      return res;
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  }

  /**
   * Sends a user message to the AI Health Agent (Non-streaming fallback)
   */
  async chatWithAgent(message, history = [], healthContext = {}) {
    const response = await apiRequest(
      '/ai/symptom-chat',
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          history,
          healthContext,
          cycleContext: healthContext.cycle || healthContext,
        }),
      },
      15000
    );

    if (response && response.success && response.data && response.data.reply) {
      return response.data;
    }

    const errorMsg =
      (typeof response?.error === 'string' && response.error) ||
      response?.error?.message ||
      'There was a problem connecting to the AI. Please try again.';
    throw new Error(errorMsg);
  }

  /**
   * Real-time SSE streaming chat with Gemini 2.5
   * Streams tokens chunk by chunk directly into the chat UI, with real-time tool execution events
   */
  streamChatWithAgent(message, history = [], healthContext = {}, onChunk, onComplete, onError, onToolAction) {
    const baseUrl = getBaseApiUrl();
    const url = `${baseUrl}/ai/symptom-chat-stream`;

    let aborted = false;
    let xhr = null;

    getAuthSessionSafe()
      .then((session) => {
        if (aborted) return;
        xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        if (session?.token) {
          xhr.setRequestHeader('Authorization', `Bearer ${session.token}`);
        }

        let processedIndex = 0;
        let accumulatedText = '';
        let finalTriage = null;
        let finalQuickReplies = [];
        const executedToolActions = [];

        xhr.onprogress = () => {
          const currentText = xhr.responseText;
          const newChunk = currentText.slice(processedIndex);
          processedIndex = currentText.length;

          const lines = newChunk.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              const jsonStr = trimmed.slice(5).trim();
              try {
                const data = JSON.parse(jsonStr);
                if (data.chunk) {
                  accumulatedText += data.chunk;
                  if (onChunk) onChunk(accumulatedText);
                }
                if (data.triage) {
                  finalTriage = data.triage;
                }
                if (data.suggestedQuickReplies) {
                  finalQuickReplies = data.suggestedQuickReplies;
                }
                if (data.tool_action) {
                  executedToolActions.push(data.tool_action);
                  if (onToolAction) onToolAction(data.tool_action);
                }
                if (data.toolActions && Array.isArray(data.toolActions)) {
                  for (const ta of data.toolActions) {
                    if (!executedToolActions.some((e) => e.id === ta.id && e.tool === ta.tool)) {
                      executedToolActions.push(ta);
                    }
                  }
                }
                if (data.error) {
                  if (onError) onError(new Error(data.error));
                  return;
                }
              } catch {}
            }
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            if (onComplete) {
              onComplete({
                reply: accumulatedText,
                triage: finalTriage,
                suggestedQuickReplies: finalQuickReplies,
                toolActions: executedToolActions,
                isAiGenerated: true,
              });
            }
          } else {
            if (onError) onError(new Error('There was a problem connecting to the AI. Please try again.'));
          }
        };

        xhr.onerror = () => {
          if (onError) onError(new Error('Network error connecting to AI.'));
        };

        xhr.ontimeout = () => {
          if (onError) onError(new Error('AI request timed out.'));
        };

        xhr.timeout = 25000;

        xhr.send(
          JSON.stringify({
            message,
            history,
            healthContext,
            cycleContext: healthContext.cycle || healthContext,
          })
        );
      })
      .catch((err) => {
        if (onError) onError(err);
      });

    return () => {
      aborted = true;
      if (xhr) {
        try {
          xhr.abort();
        } catch {}
      }
    };
  }
}

export const aiService = new AIService();
export default aiService;
