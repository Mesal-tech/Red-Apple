import http, { ClientRequest, IncomingMessage } from 'http';
import { Duplex } from 'stream';
import { WebSocket, WebSocketServer } from 'ws';
import { config } from '../config';
import { consumeLiveVoiceTicket } from './liveVoiceTickets.service';

const VOICE_PATH = '/api/ai/realtime/stream';
const UPSTREAM_CONNECT_TIMEOUT_MS = 12_000;

function rejectUpgrade(socket: Duplex, status: number, statusText: string) {
  if (socket.destroyed) return;
  socket.end(`HTTP/1.1 ${status} ${statusText}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

function waitForGemini(upstream: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => finish(new Error('Gemini Live connection timed out.')), UPSTREAM_CONNECT_TIMEOUT_MS);
    const cleanup = () => {
      clearTimeout(timer);
      upstream.off('open', onOpen);
      upstream.off('error', onError);
      upstream.off('unexpected-response', onUnexpectedResponse);
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const onOpen = () => finish();
    const onError = (error: Error) => finish(error);
    const onUnexpectedResponse = (_request: ClientRequest, response: IncomingMessage) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => {
        if (Buffer.concat(chunks).length < 4_000) chunks.push(Buffer.from(chunk));
      });
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8').slice(0, 4_000);
        console.error('[GeminiLiveProxy] Upstream rejected WebSocket upgrade:', response.statusCode, body || response.statusMessage || 'No response body');
        finish(new Error(`Gemini Live rejected the connection (HTTP ${response.statusCode || 'unknown'}).`));
      });
    };
    upstream.once('open', onOpen);
    upstream.once('error', onError);
    upstream.once('unexpected-response', onUnexpectedResponse);
  });
}

function sendErrorAndClose(socket: WebSocket, message: string) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ error: { message } }));
  socket.close(1011, 'Voice connection failed');
}

export function attachGeminiLiveProxy(server: http.Server) {
  const clients = new WebSocketServer({ noServer: true, maxPayload: 1_000_000, perMessageDeflate: false });

  server.on('upgrade', async (request, socket, head) => {
    let requestUrl: URL;
    try {
      requestUrl = new URL(request.url || '/', 'http://localhost');
    } catch {
      rejectUpgrade(socket, 400, 'Bad Request');
      return;
    }
    if (requestUrl.pathname !== VOICE_PATH) {
      rejectUpgrade(socket, 404, 'Not Found');
      return;
    }

    const ticket = consumeLiveVoiceTicket(requestUrl.searchParams.get('ticket') || '');
    if (!ticket) {
      rejectUpgrade(socket, 401, 'Unauthorized');
      return;
    }
    if (!config.gemini.apiKey.trim()) {
      rejectUpgrade(socket, 503, 'Service Unavailable');
      return;
    }

    const upstreamUrl = new URL('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent');
    upstreamUrl.searchParams.set('key', config.gemini.apiKey);
    // Gemini Live exchanges JSON text frames; avoid negotiating compression with
    // the upstream service so the initial session setup remains a plain text frame.
    const upstream = new WebSocket(upstreamUrl, { perMessageDeflate: false });

    try {
      await waitForGemini(upstream);
    } catch (error: any) {
      console.error('[GeminiLiveProxy] Could not open upstream Live session:', error?.message || 'Unknown error');
      try { upstream.close(); } catch {}
      rejectUpgrade(socket, 502, 'Bad Gateway');
      return;
    }

    if (socket.destroyed) {
      upstream.close();
      return;
    }

    clients.handleUpgrade(request, socket, head, (client) => {
      console.info('[GeminiLiveProxy] Gemini WebSocket connected; sending session setup.');
      let setupResponseTimer: NodeJS.Timeout | null = setTimeout(() => {
        setupResponseTimer = null;
        console.error('[GeminiLiveProxy] Gemini sent no response to the session setup.');
        sendErrorAndClose(client, 'Gemini Live did not respond to the session setup. Check Gemini API access and backend logs.');
        upstream.close(1011, 'Gemini setup timed out');
      }, 15_000);

      client.on('message', (data, isBinary) => {
        if (upstream.readyState === WebSocket.OPEN) upstream.send(data, { binary: isBinary });
      });
      upstream.on('message', (data, isBinary) => {
        const frame = Buffer.isBuffer(data)
          ? data
          : data instanceof ArrayBuffer
            ? Buffer.from(data)
            : Buffer.concat(data);
        console.info('[GeminiLiveProxy] Gemini frame received:', { isBinary, bytes: frame.length });
        let outgoingData: Buffer | string = frame;
        let outgoingBinary = isBinary;
        try {
          const frameText = frame.toString('utf8');
          const payload = JSON.parse(frameText);
          if (isBinary) {
            outgoingData = frameText;
            outgoingBinary = false;
          }
          if (payload.setupComplete || payload.error) {
            if (setupResponseTimer) {
              clearTimeout(setupResponseTimer);
              setupResponseTimer = null;
            }
          }
          if (payload.error) {
            console.error('[GeminiLiveProxy] Gemini rejected session setup:', {
              code: payload.error.code,
              status: payload.error.status,
            });
          } else {
            console.info('[GeminiLiveProxy] Gemini message received:', Object.keys(payload).join(', '));
          }
        } catch {
          if (!isBinary) console.warn('[GeminiLiveProxy] Gemini sent a non-JSON text message.');
        }
        if (client.readyState === WebSocket.OPEN) client.send(outgoingData, { binary: outgoingBinary });
      });
      client.on('close', (code, reason) => {
        if (setupResponseTimer) {
          clearTimeout(setupResponseTimer);
          setupResponseTimer = null;
        }
        if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
          upstream.close(code === 1000 ? 1000 : 1001, reason.toString().slice(0, 120));
        }
      });
      upstream.on('close', (code, reason) => {
        if (setupResponseTimer) {
          clearTimeout(setupResponseTimer);
          setupResponseTimer = null;
        }
        console.info('[GeminiLiveProxy] Gemini WebSocket closed:', code, reason.toString().slice(0, 120));
        if (client.readyState === WebSocket.OPEN) {
          const safeCode = code >= 1000 && code < 5000 && code !== 1005 ? code : 1011;
          client.close(safeCode, reason.toString().slice(0, 120));
        }
      });
      upstream.on('error', (error) => {
        console.error('[GeminiLiveProxy] Upstream session error:', error.message);
        sendErrorAndClose(client, 'Gemini Live encountered a connection error. Please reconnect.');
      });
      client.on('error', (error) => {
        console.warn('[GeminiLiveProxy] Mobile WebSocket error:', error.message);
        upstream.close();
      });

      upstream.send(JSON.stringify({ setup: ticket.setup }), (error) => {
        if (error) {
          console.error('[GeminiLiveProxy] Could not send session setup to Gemini:', error.message);
          sendErrorAndClose(client, 'Could not send the voice session setup to Gemini. Please retry.');
        }
      });
    });
  });

  return clients;
}
