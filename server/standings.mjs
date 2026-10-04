import { createHash } from 'node:crypto';

// Equal points are compared only within that tied set. Stable input order is
// presentation order, never an implicit competitive tiebreak.
function tiers(teamIds, matches) {
  const points = new Map(teamIds.map(id => [id, 0]));
  for (const match of matches) if (points.has(match.winnerId)) points.set(match.winnerId, points.get(match.winnerId) + 1);
  const buckets = new Map();
  for (const id of teamIds) {
    const value = points.get(id);
    if (!buckets.has(value)) buckets.set(value, []);
    buckets.get(value).push(id);
  }
  return [...buckets].sort(([a], [b]) => b - a).flatMap(([, ids]) => {
    const head = new Map(ids.map(id => [id, 0]));
    for (const match of matches) if (match.teams.every(id => head.has(id)) && head.has(match.winnerId)) head.set(match.winnerId, head.get(match.winnerId) + 1);
    const tied = new Map();
    for (const id of ids) {
      const value = head.get(id);
      if (!tied.has(value)) tied.set(value, []);
      tied.get(value).push(id);
    }
    return [...tied].sort(([a], [b]) => b - a).map(([, ids]) => ids);
  });
}

export function rankGroup(stage, group, teamIds, baseMatches, tieMatches) {
  const completeBase = teamIds.every(Boolean) && baseMatches.length > 0 && baseMatches.every(match => match.winnerId);
  const rows = teamIds.map(teamId => {
    const wins = baseMatches.filter(match => match.winnerId === teamId && teamId).length;
    const losses = baseMatches.filter(match => match.winnerId && match.teams.includes(teamId) && match.winnerId !== teamId).length;
    return { teamId, points: wins, wins, losses, rank: null };
  });
  const pending = [], activeTieIds = [];
  function assign(ids, rank) {
    if (ids.length === 1) { rows.find(row => row.teamId === ids[0]).rank = rank; return; }
    const scope = createHash('sha256').update(JSON.stringify([stage.id, group.id, rank, [...ids].sort()])).digest('hex').slice(0, 24);
    const existing = tieMatches.filter(match => match.tiebreak.scope === scope);
    const rounds = [...new Set(existing.map(match => match.tiebreak.round))].sort((a, b) => a - b);
    if (!rounds.length) pending.push({ scope, round: 1, groupId: group.id, rankStart: rank, teamIds: ids });
    for (const round of rounds) {
      const matches = existing.filter(match => match.tiebreak.round === round);
      activeTieIds.push(...matches.map(match => match.id));
      if (!matches.every(match => match.winnerId)) return;
      const next = tiers(ids, matches);
      if (next.length > 1) {
        let start = rank;
        for (const subset of next) { assign(subset, start); start += subset.length; }
        return;
      }
      if (round === rounds.at(-1)) pending.push({ scope, round: round + 1, groupId: group.id, rankStart: rank, teamIds: ids });
    }
  }
  if (completeBase) {
    let rank = 1;
    for (const ids of tiers(teamIds, baseMatches)) { assign(ids, rank); rank += ids.length; }
  }
  rows.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || b.points - a.points);
  return { stageId: stage.id, stageName: stage.name, groupId: group.id, name: group.name, rows, completed: completeBase && rows.every(row => row.rank !== null), pending, activeTieIds };
}

export function tieDefinitions(stageId, pending) {
  const definitions = [];
  for (const tie of pending) for (let a = 0; a < tie.teamIds.length; a++) for (let b = a + 1; b < tie.teamIds.length; b++) {
    const key = `TB-${tie.scope}-${tie.round}-${a + 1}-${b + 1}`;
    definitions.push({ id: `${stageId}:${key}`, key, stageId, groupId: tie.groupId, branch: 'tiebreak', round: tie.round, bo: 1, sources: [tie.teamIds[a], tie.teamIds[b]].map(teamId => ({ kind: 'team', teamId })), tiebreak: tie });
  }
  return definitions;
}
