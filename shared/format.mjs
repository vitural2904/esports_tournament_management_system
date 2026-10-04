function invalid(message) { throw Object.assign(new Error(message), { status: 400 }); }
function name(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) invalid(`${label} cần 1–80 ký tự.`);
  return value.trim();
}
function id(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(value)) invalid('Mã giai đoạn hoặc bảng không hợp lệ.');
  return value;
}
function bo(value) { if (![1, 3, 5].includes(value)) invalid('BO cần là 1, 3 hoặc 5.'); return value; }
const outcome = (kind, match) => ({ kind, matchId: match.id });

// Pure schema validation and graph construction. No database or HTTP state.
export function compileFormat(input, teamIds, { requireAllTeams = false } = {}) {
  if (!input || input.version !== 1 || !Array.isArray(input.stages) || !input.stages.length || input.stages.length > 12) invalid('Thể thức cần 1–12 giai đoạn.');
  const registered = new Set(teamIds), stages = [], matches = [];
  function source(value) {
    if (!value || typeof value !== 'object') invalid('Nguồn đội không hợp lệ.');
    if (value.kind === 'team') {
      if (!registered.has(value.teamId)) invalid('Đội chưa đăng ký cho giải.');
      return { kind: 'team', teamId: value.teamId };
    }
    if (value.kind === 'seed') {
      const group = stages.find(stage => stage.id === value.stageId && stage.type === 'round_robin')?.groups.find(group => group.id === value.groupId);
      if (!group || !Number.isInteger(value.rank) || value.rank < 1 || value.rank > group.inputs.length) invalid('Seed cần lấy từ bảng của giai đoạn trước.');
      return { kind: 'seed', stageId: value.stageId, groupId: value.groupId, rank: value.rank };
    }
    if (value.kind === 'placement') {
      const previous = stages.find(stage => stage.id === value.stageId && stage.type !== 'round_robin');
      if (!previous || ![1, 2].includes(value.rank)) invalid('Hạng chung cuộc cần lấy hạng 1 hoặc 2 từ nhánh trước.');
      return { kind: 'placement', stageId: value.stageId, rank: value.rank };
    }
    if (['winner', 'loser'].includes(value.kind)) {
      const previous = matches.find(match => match.id === value.matchId);
      if (!previous || previous.condition) invalid('Nguồn thắng/thua cần lấy từ trận chắc chắn diễn ra của giai đoạn trước. Dùng hạng chung cuộc cho nhánh có reset.');
      return { kind: value.kind, matchId: value.matchId };
    }
    invalid('Loại nguồn đội không được hỗ trợ.');
  }
  function sources(values) {
    if (!Array.isArray(values) || values.length < 2 || values.length > 64) invalid('Mỗi bảng hoặc nhánh cần 2–64 nguồn đội.');
    const result = values.map(source);
    if (new Set(result.map(value => JSON.stringify(value))).size !== result.length) invalid('Nguồn đội bị trùng trong giai đoạn.');
    return result;
  }
  for (const raw of input.stages) {
    if (!raw || typeof raw !== 'object') invalid('Giai đoạn không hợp lệ.');
    const stage = { id: id(raw.id), name: name(raw.name, 'Tên giai đoạn'), type: raw.type, bo: bo(raw.bo) };
    if (stages.some(item => item.id === stage.id)) invalid('Mã giai đoạn bị trùng.');
    function add(key, branch, round, inputs, bestOf = stage.bo, groupId, condition) {
      const match = { id: `${stage.id}:${key}`, key, stageId: stage.id, branch, round, bo: bestOf, sources: inputs, ...(groupId ? { groupId } : {}), ...(condition ? { condition } : {}) };
      matches.push(match);
      if (matches.length > 4096) invalid('Thể thức vượt quá 4096 trận.');
      return match;
    }
    if (stage.type === 'round_robin') {
      if (![1, 2].includes(raw.rounds) || !Array.isArray(raw.groups) || !raw.groups.length || raw.groups.length > 32) invalid('Vòng tròn cần bảng và 1 hoặc 2 lượt.');
      stage.rounds = raw.rounds;
      // Validate every input before producing this stage's matches. This forbids self-reference.
      stage.groups = raw.groups.map(group => {
        if (!group || typeof group !== 'object') invalid('Bảng không hợp lệ.');
        return { id: id(group.id), name: name(group.name, 'Tên bảng'), inputs: sources(group.inputs) };
      });
      if (new Set(stage.groups.map(group => group.id)).size !== stage.groups.length) invalid('Mã bảng bị trùng.');
      const identities = stage.groups.flatMap(group => group.inputs.map(value => JSON.stringify(value)));
      if (new Set(identities).size !== identities.length) invalid('Đội hoặc seed xuất hiện trong nhiều bảng.');
      for (const group of stage.groups) for (let leg = 1; leg <= stage.rounds; leg++) {
        for (let a = 0; a < group.inputs.length; a++) for (let b = a + 1; b < group.inputs.length; b++) {
          const pair = [group.inputs[a], group.inputs[b]];
          add(`${group.id}-${leg}-${a + 1}-${b + 1}`, 'group', leg, leg === 1 ? pair : pair.reverse(), stage.bo, group.id);
        }
      }
    } else if (['single_elimination', 'double_elimination'].includes(stage.type)) {
      stage.inputs = sources(raw.inputs);
      const count = stage.inputs.length;
      if ((count & (count - 1)) !== 0) invalid('Nhánh loại cần 2, 4, 8, 16, 32 hoặc 64 nguồn đội.');
      stage.finalBo = bo(raw.finalBo ?? stage.bo);
      if (stage.type === 'double_elimination') {
        if (raw.reset !== true) invalid('Loại kép cần reset chung kết để giữ điều kiện loại sau hai trận thua.');
        stage.reset = true;
      }
      const upper = [];
      let entrants = stage.inputs, upperIndex = 0;
      while (entrants.length > 1) {
        const round = upper.length + 1, current = [];
        for (let i = 0; i < entrants.length; i += 2) current.push(add(`U${++upperIndex}`, 'upper', round, entrants.slice(i, i + 2), entrants.length === 2 ? stage.finalBo : stage.bo));
        upper.push(current); entrants = current.map(match => outcome('winner', match));
      }
      if (stage.type === 'double_elimination') {
        let lowerIndex = 0, lowerRound = 1, survivors;
        if (count === 2) survivors = [outcome('loser', upper[0][0])];
        else {
          survivors = [];
          for (let i = 0; i < upper[0].length; i += 2) survivors.push(outcome('winner', add(`L${++lowerIndex}`, 'lower', lowerRound, upper[0].slice(i, i + 2).map(match => outcome('loser', match)))));
          for (let r = 1; r < upper.length; r++) {
            lowerRound++;
            survivors = survivors.map((winner, i) => outcome('winner', add(`L${++lowerIndex}`, 'lower', lowerRound, [winner, outcome('loser', upper[r][upper[r].length > 1 ? i ^ 1 : i])], r === upper.length - 1 ? stage.finalBo : stage.bo)));
            if (survivors.length > 1) {
              lowerRound++;
              const next = [];
              for (let i = 0; i < survivors.length; i += 2) next.push(outcome('winner', add(`L${++lowerIndex}`, 'lower', lowerRound, survivors.slice(i, i + 2))));
              survivors = next;
            }
          }
        }
        const finalists = [outcome('winner', upper.at(-1)[0]), survivors[0]];
        const final = add('F1', 'final', 1, finalists, stage.finalBo);
        if (stage.reset) add('F2', 'final', 2, finalists, stage.finalBo, undefined, { kind: 'reset', matchId: final.id, challenger: finalists[1] });
      }
    } else invalid('Loại giai đoạn không được hỗ trợ.');
    if (raw.matchBo !== undefined) {
      if (!raw.matchBo || typeof raw.matchBo !== 'object' || Array.isArray(raw.matchBo)) invalid('BO riêng của trận không hợp lệ.');
      stage.matchBo = {};
      for (const [key, value] of Object.entries(raw.matchBo)) {
        const match = matches.find(match => match.stageId === stage.id && match.key === key);
        if (!match) invalid('BO riêng trỏ tới trận không tồn tại.');
        stage.matchBo[key] = bo(value); match.bo = value;
      }
    }
    stages.push(stage);
  }
  if (requireAllTeams) {
    const first = stages[0];
    const initial = first.type === 'round_robin' ? first.groups.flatMap(group => group.inputs) : first.inputs;
    if (initial.length !== registered.size || initial.some(value => value.kind !== 'team') || new Set(initial.map(value => value.teamId)).size !== registered.size) invalid('Giai đoạn đầu cần chứa đúng tất cả đội đã đăng ký.');
    const last = stages.at(-1);
    if (last.type === 'round_robin' && last.groups.length !== 1) invalid('Giai đoạn cuối cần xác định một nhà vô địch. Gộp thành một bảng hoặc thêm giai đoạn loại trực tiếp/loại kép.');
  }
  return { format: { version: 1, stages }, matches };
}

export function createPreset(kind, teamIds) {
  const inputs = teamIds.map(teamId => ({ kind: 'team', teamId }));
  if (kind === 'demo') {
    if (teamIds.length !== 8) invalid('Preset vòng bảng và loại kép cần đúng 8 đội đăng ký.');
    const seed = (groupId, rank) => ({ kind: 'seed', stageId: 'groups', groupId, rank });
    return { version: 1, stages: [
      { id: 'groups', name: 'Vòng bảng', type: 'round_robin', bo: 1, rounds: 2, groups: [{ id: 'A', name: 'Bảng A', inputs: inputs.slice(0, 4) }, { id: 'B', name: 'Bảng B', inputs: inputs.slice(4) }] },
      { id: 'playoffs', name: 'Loại kép', type: 'double_elimination', bo: 3, finalBo: 5, reset: true, inputs: [seed('A', 1), seed('B', 4), seed('B', 2), seed('A', 3), seed('B', 1), seed('A', 4), seed('A', 2), seed('B', 3)] },
    ] };
  }
  if (!['round_robin', 'single_elimination', 'double_elimination'].includes(kind)) invalid('Preset không tồn tại.');
  return { version: 1, stages: [{ id: 'stage1', name: kind === 'round_robin' ? 'Vòng tròn' : kind === 'single_elimination' ? 'Loại trực tiếp' : 'Loại kép', type: kind, bo: kind === 'round_robin' ? 1 : 3, ...(kind === 'round_robin' ? { rounds: 1, groups: [{ id: 'A', name: 'Bảng A', inputs }] } : { inputs, finalBo: 5, ...(kind === 'double_elimination' ? { reset: true } : {}) }) }] };
}
