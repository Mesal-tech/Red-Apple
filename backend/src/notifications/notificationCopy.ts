import { EngagementTier } from './engagement';

export type NotificationTone = 'gentle' | 'cheeky';
export type NotificationCopyVariant = { id: string; title: string; body: string };
type CopyPair = [string, string];
const bothModes = (pairs: CopyPair[]) => ({ discreet: pairs, open: pairs });

const gentle = {
  morning: bothModes([
    ['A gentle hello', 'A fresh day is here. Dr. Red is cheering you on.'],
    ['Good morning', 'Take today at your own pace. I’m here if you need me.'],
    ['A little hello', 'Wishing you a calm start. Drop by whenever it suits you.'],
    ['Dr. Red says hello', 'No rush today. I’m around whenever you want a moment.'],
  ]),
  streak_at_risk: bothModes([
    ['A gentle hello', 'Your routine is yours to shape. I’m here when it feels right.'],
    ['Checking in', 'Take today at your own pace. I’m here if you need me.'],
    ['A little hello', 'A small step can be enough. Come by whenever it suits you.'],
    ['Dr. Red says hello', 'No pressure today. I’m around whenever you want a moment.'],
  ]),
  missed_1: bothModes([
    ['A gentle hello', 'It’s okay to take a pause. I’m here whenever you’re ready.'],
    ['Checking in', 'No need to catch up. We can start fresh whenever you like.'],
    ['A little hello', 'Take the time you need. I’ll be here when you want.'],
    ['Dr. Red says hello', 'Your pace is the right pace. Drop by anytime.'],
  ]),
  missed_2: bothModes([
    ['A gentle hello', 'Just leaving a little note: support is here whenever you want it.'],
    ['Checking in', 'There’s no pressure to reply. I’m here when it feels right.'],
    ['A little hello', 'Take care of yourself in whatever way works for you today.'],
    ['Dr. Red says hello', 'Whenever you feel like stopping by, I’ll be here.'],
  ]),
  breakup: bothModes([
    ['A gentle hello', 'I’ll give you space. You can find me whenever you need support.'],
    ['No rush', 'I’ll be quiet for now. Come back whenever it feels right.'],
    ['A little note', 'Take the space you need. I’m here if you want company.'],
    ['Dr. Red says hello', 'I’ll leave the door open. Stop by whenever you like.'],
  ]),
  winback: bothModes([
    ['Welcome back', 'It’s good to see you. What would feel helpful today?'],
    ['A fresh start', 'We can pick up wherever you are. I’m here for you.'],
    ['A little hello', 'No need to explain. Let’s take things one step at a time.'],
    ['Dr. Red says hello', 'Whenever you’re ready, we can begin again together.'],
  ]),
};

const cheeky = {
  morning: bothModes([
    ['Dr. Red reporting in', 'A fresh day, a fresh start. I brought the good vibes. 🍎'],
    ['Your friendly nudge', 'Tiny check-in? I promise to keep it breezy.'],
    ['Hello, sunshine', 'Your day called. It said you’ve got this.'],
    ['A little hello', 'I’m here with support and excellent virtual snacks.'],
  ]),
  streak_at_risk: bothModes([
    ['Your streak says hi', 'One small step keeps your rhythm rolling. You’ve got this.'],
    ['A tiny nudge', 'Your routine is waving. Want to pop in for a moment?'],
    ['Dr. Red is cheering', 'A quick hello can keep your good rhythm going.'],
    ['Friendly reminder', 'Your streak is rooting for you. No pressure, just a nudge.'],
  ]),
  missed_1: bothModes([
    ['No catch-up quiz', 'Whenever you’re ready, we can pick things up together.'],
    ['Dr. Red says hi', 'A pause is allowed. I saved you a seat.'],
    ['A little nudge', 'Want to pop in? We can keep it short and simple.'],
    ['Fresh start energy', 'No scorecards here. Drop by when it works for you.'],
  ]),
  missed_2: bothModes([
    ['Still in your corner', 'No need to catch up. We can take one small step together.'],
    ['A friendly hello', 'I’m here when you want a hand. Zero fuss, promise.'],
    ['Dr. Red checking in', 'Your pace, your rules. Want to say hello?'],
    ['No pressure nudge', 'Whenever it suits you, I’m ready with a fresh start.'],
  ]),
  breakup: bothModes([
    ['I’ll give you space', 'I’ll turn down the chatter. Your seat stays saved.'],
    ['Quiet mode, activated', 'I’ll be here when you want a little company.'],
    ['A tiny wave goodbye', 'No pressure to reply. The door stays open.'],
    ['Dr. Red signing off', 'I’ll let you be. Drop by again whenever you like.'],
  ]),
  winback: bothModes([
    ['Look who’s back', 'No recap needed. What would help today?'],
    ['Fresh-start club', 'We can jump in wherever you are. I saved your spot.'],
    ['Dr. Red says welcome', 'No fuss, no catching up. Shall we start small?'],
    ['A friendly hello', 'Good to see you. Your next step can be a tiny one.'],
  ]),
};

export const notificationCopy = {
  gentle,
  cheeky,
} as const;

export function getCopyVariants(tier: EngagementTier, tone: NotificationTone, discreet: boolean): NotificationCopyVariant[] {
  const pairs = notificationCopy[tone][tier][discreet ? 'discreet' : 'open'] as CopyPair[];
  return pairs.map(([title, body], index) => ({ id: `${tier}:${tone}:${discreet ? 'discreet' : 'open'}:${index + 1}`, title, body }));
}

export function chooseCopyVariant(variants: NotificationCopyVariant[], previouslyUsed: string[]): NotificationCopyVariant {
  const lastUsed = new Set(previouslyUsed.slice(-3));
  return variants.find((variant) => !lastUsed.has(variant.id)) || variants[0];
}
