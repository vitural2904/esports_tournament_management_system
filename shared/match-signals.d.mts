export type SignalTone = 'next' | 'active' | 'attention' | 'error' | 'success' | 'neutral';
export type SignalLabel = { text: string; tone: SignalTone; icon: 'alert' | 'check' | 'activity' | 'minus' | 'clipboard' | 'clock' | 'pencil' | 'error' };
export type MatchSignal = { lifecycle: SignalLabel; attention: SignalLabel | null; schedule: SignalLabel | null; isNext: boolean; scheduledAt: number | null; borderTone: SignalTone };
export const signalPresentation: { soonMinutes: number };
export function matchSignals(matches: { id: string; status: 'waiting' | 'ready' | 'in_progress' | 'completed' | 'skipped'; scheduledAt: string | null; games: { state: string }[]; decision?: unknown }[], now: number): Record<string, MatchSignal>;
