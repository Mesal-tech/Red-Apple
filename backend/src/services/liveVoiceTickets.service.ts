import { randomBytes } from 'crypto';

const TICKET_TTL_MS = 60_000;
const MAX_TICKETS = 2_000;

type LiveVoiceTicket = {
  userId: string;
  setup: Record<string, unknown>;
  expiresAt: number;
};

const tickets = new Map<string, LiveVoiceTicket>();

function removeExpiredTickets(now: number) {
  for (const [ticket, value] of tickets) {
    if (value.expiresAt <= now) tickets.delete(ticket);
  }
}

export function createLiveVoiceTicket(userId: string, setup: Record<string, unknown>) {
  const now = Date.now();
  removeExpiredTickets(now);
  if (tickets.size >= MAX_TICKETS) {
    const oldestTicket = tickets.keys().next().value;
    if (oldestTicket) tickets.delete(oldestTicket);
  }

  const ticket = randomBytes(32).toString('base64url');
  const expiresAt = now + TICKET_TTL_MS;
  tickets.set(ticket, { userId, setup, expiresAt });
  return { ticket, expiresAt };
}

export function consumeLiveVoiceTicket(ticket: string): LiveVoiceTicket | null {
  if (!ticket) return null;
  const now = Date.now();
  removeExpiredTickets(now);
  const value = tickets.get(ticket);
  if (!value) return null;
  tickets.delete(ticket);
  return value;
}
