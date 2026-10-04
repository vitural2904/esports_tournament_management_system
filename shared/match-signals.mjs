export const signalPresentation = { soonMinutes: 30 };
const label = (text, tone, icon) => ({ text, tone, icon });
const lifecycle = {
 waiting: label('Chờ đủ điều kiện', 'attention', 'alert'),
 ready: label('Sẵn sàng', 'neutral', 'check'),
 in_progress: label('Đang vận hành', 'active', 'activity'),
 completed: label('Hoàn tất', 'neutral', 'check'),
 skipped: label('Không cần đấu', 'neutral', 'minus'),
};
/** Calculate over the entire tournament before applying any view filter. */
export function matchSignals(matches, now) {
 const time = value => {
  if (typeof value !== 'string') return NaN;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!parts) return NaN;
  const [, year, month, day] = parts.map(Number);
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return NaN;
  return Date.parse(value);
 };
 const candidates = matches.filter(match => ['ready', 'waiting'].includes(match.status) && time(match.scheduledAt) >= now);
 const next = Math.min(...candidates.map(match => time(match.scheduledAt)));
 return Object.fromEntries(matches.map(match => {
  const at = time(match.scheduledAt);
  const isNext = candidates.includes(match) && at === next;
  const needsStart = ['ready', 'waiting'].includes(match.status);
  const attention = ['ready', 'in_progress'].includes(match.status) && !match.decision && match.games.some(game => game.state === 'submitted') ? label('Chờ xác nhận', 'attention', 'clipboard') : null;
  const schedule = !Number.isFinite(at) ? label('Chưa đặt lịch', 'neutral', 'clock') : needsStart && at < now ? label('Giờ lịch đã qua · chưa ghi nhận vận hành', 'attention', 'alert') : needsStart && at === now ? label('Đến giờ theo lịch', isNext ? 'next' : 'neutral', 'clock') : needsStart && at > now && at - now <= signalPresentation.soonMinutes * 60000 ? label('Sắp đến giờ', isNext ? 'next' : 'neutral', 'clock') : null;
  const borderTone = attention || match.status === 'waiting' || schedule?.tone === 'attention' ? 'attention' : match.status === 'in_progress' ? 'active' : isNext ? 'next' : 'neutral';
  return [match.id, { lifecycle: lifecycle[match.status], attention, schedule, isNext, scheduledAt: Number.isFinite(at) ? at : null, borderTone }];
 }));
}

