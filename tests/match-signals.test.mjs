import test from 'node:test';
import assert from 'node:assert/strict';
import { matchSignals } from '../shared/match-signals.mjs';
const now = Date.parse('2026-10-04T10:20:00Z');
const match = (id, scheduledAt, status = 'ready', games = []) => ({ id, scheduledAt, status, games });
test('all matches at the earliest UTC time are next, including waiting teams', () => {
 const signals = matchSignals([match('a', '2026-10-04T18:00:00+07:00'), match('b', '2026-10-04T11:00:00Z', 'waiting'), match('c', '2026-10-05T11:00:00Z')], now);
 assert.equal(signals.a.isNext, true);
 assert.equal(signals.b.isNext, true);
 assert.equal(signals.b.lifecycle.text, 'Chờ đủ điều kiện');
 assert.equal(signals.c.isNext, false);
});
test('schedule signals never infer live operation and exclude closed or active matches from next', () => {
 const list = [match('past', '2026-10-04T10:00:00Z'), match('due', '2026-10-04T10:20:00Z'), match('active', '2026-10-04T10:20:00Z', 'in_progress', [{state:'submitted'}]), match('done', '2026-10-04T10:20:00Z', 'completed'), match('skip', '2026-10-04T10:20:00Z', 'skipped'), match('bad', 'invalid'), match('missing', null)];
 const signals = matchSignals(list, now);
 assert.equal(signals.past.lifecycle.text, 'Sẵn sàng');
 assert.equal(signals.past.schedule.text, 'Giờ lịch đã qua · chưa ghi nhận vận hành');
 assert.equal(signals.due.schedule.text, 'Đến giờ theo lịch');
 assert.equal(signals.due.isNext, true);
 for (const id of ['past','active','done','skip','bad','missing']) assert.equal(signals[id].isNext, false);
 assert.equal(signals.active.lifecycle.text, 'Đang vận hành');
 assert.equal(signals.active.attention.text, 'Chờ xác nhận');
 assert.equal(signals.active.borderTone, 'attention');
 assert.equal(signals.bad.schedule.text, 'Chưa đặt lịch');
 assert.equal(signals.missing.scheduledAt, null);
 const updated = matchSignals([match('active', list[2].scheduledAt, 'in_progress', [{state:'confirmed'}])], now);
 assert.equal(updated.active.attention, null);
 assert.equal(updated.active.borderTone, 'active');
});
test('minute changes advance next without changing input order or view selection', () => {
 const list = [match('later', '2026-10-04T11:00:00Z'), match('soon', '2026-10-04T10:30:00Z')];
 const signals = matchSignals(list, now);
 assert.equal(signals.soon.schedule.text, 'Sắp đến giờ');
 assert.equal(signals.later.isNext, false);
 const nextMinute = matchSignals(list, Date.parse('2026-10-04T10:31:00Z'));
 assert.equal(nextMinute.soon.isNext, false);
 assert.equal(nextMinute.later.isNext, true);
 assert.deepEqual(list.map(item => item.id), ['later','soon']);
});
test('invalid calendar date cannot become the next scheduled match', () => {
 const signals = matchSignals([match('bad', '2026-02-30T12:00:00Z')], Date.parse('2026-02-28T12:00:00Z'));
 assert.equal(signals.bad.isNext, false);
 assert.equal(signals.bad.scheduledAt, null);
});
