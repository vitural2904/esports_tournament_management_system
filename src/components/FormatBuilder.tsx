import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { LockKeyhole, Plus, Save, Shuffle } from "lucide-react";
import { compileFormat, createPreset } from "../../shared/format.mjs";
import type { Format, Source, Stage, StageType } from "../../shared/format.mjs";
import { api } from "../lib/api";
import type { Tournament } from "../lib/api";
import "./FormatBuilder.css";

type BuiltTournament = Omit<Tournament, "format"> & { format: Format | null };
const titles: Record<StageType, string> = { round_robin: "Vòng tròn", single_elimination: "Loại trực tiếp", double_elimination: "Loại kép" };
const branches: Record<string, string> = { group: "Vòng bảng", upper: "Nhánh thắng", lower: "Nhánh thua", final: "Chung kết" };

export default function FormatBuilder({ tournamentId, revision, onSaved }: { tournamentId: string; revision?: number; onSaved: () => Promise<void> }) {
  const [event, setEvent] = useState<BuiltTournament | null>(null);
  const [draft, setDraft] = useState<Format | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedMatch, setSelectedMatch] = useState("");
  useEffect(() => {
    let current = true;
    void api<{ tournament: BuiltTournament }>(`/tournaments/${tournamentId}`).then(result => {
      if (current) {
        setEvent(result.tournament);
        setDraft(existing => {
          const initial = createPreset("round_robin", result.tournament.registrations.map(item => item.team.id));
          if (!existing || result.tournament.lockedAt) return result.tournament.format || initial;
          if (!result.tournament.format && existing.stages.length === 1 && existing.stages[0].id === "stage1" && existing.stages[0].groups?.length === 1 && existing.stages[0].groups[0].inputs.length === 0) return initial;
          return existing;
        });
      }
    }).catch(problem => { if (current) setError(problem.message); });
    return () => { current = false; };
  }, [tournamentId, revision]);
  const teamIds = useMemo(() => event?.registrations.map(item => item.team.id) || [], [event]);
  const preview = useMemo(() => {
    if (!draft) return { matches: [], problem: "" };
    try { return { matches: compileFormat(draft, teamIds).matches, problem: "" }; }
    catch (problem) { return { matches: [], problem: problem instanceof Error ? problem.message : "Cấu hình chưa hợp lệ." }; }
  }, [draft, teamIds]);
  const editable = event?.roles.includes("operator") && !event.lockedAt;
  const dirty = JSON.stringify(draft) !== JSON.stringify(event?.format);
  function change(edit: (format: Format) => void) {
    if (!draft || !editable) return;
    const next = structuredClone(draft); edit(next); setDraft(next); setNotice("");
  }
  function patchStage(index: number, patch: Partial<Stage>) { change(format => Object.assign(format.stages[index], patch)); }
  function label(source: Source) {
    if (source.kind === "team") return event?.registrations.find(item => item.team.id === source.teamId)?.team.name || "Đội chưa đăng ký";
    if (source.kind === "seed") return `${draft?.stages.find(stage => stage.id === source.stageId)?.name || source.stageId} · ${source.groupId}${source.rank}`;
    if (source.kind === "placement") return `${draft?.stages.find(stage => stage.id === source.stageId)?.name || source.stageId} · hạng ${source.rank}`;
    return `${source.kind === "winner" ? "Thắng" : "Thua"} ${source.matchId}`;
  }
  function options(stageIndex: number): Source[] {
    const result: Source[] = teamIds.map(teamId => ({ kind: "team", teamId }));
    for (const stage of draft?.stages.slice(0, stageIndex) || []) {
      if (stage.type === "round_robin") for (const group of stage.groups || []) group.inputs.forEach((_, index) => result.push({ kind: "seed", stageId: stage.id, groupId: group.id, rank: index + 1 }));
      else {
        result.push({ kind: "placement", stageId: stage.id, rank: 1 }, { kind: "placement", stageId: stage.id, rank: 2 });
        for (const match of preview.matches.filter(match => match.stageId === stage.id && !match.condition)) result.push({ kind: "winner", matchId: match.id }, { kind: "loser", matchId: match.id });
      }
    }
    return result;
  }
  function choosePreset(kind: StageType | "demo") {
    try { setDraft(createPreset(kind, teamIds)); setError(""); setNotice(""); setSelectedMatch(""); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Không dùng được preset."); }
  }
  function append(type: StageType) {
    change(format => {
      const last = format.stages.at(-1);
      let inputs: Source[] = teamIds.map(teamId => ({ kind: "team", teamId }));
      if (last?.type === "round_robin") inputs = (last.groups || []).flatMap(group => group.inputs.map((_, index) => ({ kind: "seed" as const, stageId: last.id, groupId: group.id, rank: index + 1 })));
      else if (last) {
        inputs = [{ kind: "placement", stageId: last.id, rank: 1 }, { kind: "placement", stageId: last.id, rank: 2 }];
      }
      const stage = createPreset(type, teamIds).stages[0];
      stage.id = `stage-${crypto.randomUUID().slice(0, 8)}`;
      if (type === "round_robin") stage.groups = [{ id: "A", name: "Bảng A", inputs }]; else stage.inputs = inputs;
      format.stages.push(stage);
    });
  }
  function shuffle(index: number) {
    change(format => {
      const groups = format.stages[index].groups || [];
      const all = groups.flatMap(group => group.inputs);
      for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
      let offset = 0;
      for (const group of groups) { group.inputs = all.slice(offset, offset + group.inputs.length); offset += group.inputs.length; }
    });
  }
  async function save(lock = false) {
    if (!event || !draft) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await api<{ tournament: BuiltTournament }>(`/tournaments/${event.id}/${lock ? "lock" : "format"}`, { revision: event.revision, ...(!lock ? { format: draft } : {}) });
      setEvent(result.tournament); setDraft(result.tournament.format); setNotice(lock ? "Đã chốt thể thức. Cấu trúc giữ nguyên khi giải diễn ra." : "Đã lưu thể thức.");
      try { await onSaved(); } catch { setError("Đã lưu. Tải lại trang để cập nhật danh sách giải."); }
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể lưu thể thức."); }
    finally { setBusy(false); }
  }
  const inputEditor = (stageIndex: number, inputs: Source[], groupIndex?: number) => <div className="fb-inputs">{inputs.map((source, index) => <div key={index}><label>Vị trí {index + 1}<select disabled={!editable || busy} value={JSON.stringify(source)} onChange={event => change(format => { const stage = format.stages[stageIndex]; const values = groupIndex === undefined ? stage.inputs : stage.groups?.[groupIndex].inputs; if (values) values[index] = JSON.parse(event.target.value); })}>{options(stageIndex).map(option => <option key={JSON.stringify(option)} value={JSON.stringify(option)}>{label(option)}</option>)}</select></label>{editable && <button type="button" disabled={busy} aria-label={`Bỏ vị trí ${index + 1}`} onClick={() => change(format => { const stage = format.stages[stageIndex]; const values = groupIndex === undefined ? stage.inputs : stage.groups?.[groupIndex].inputs; values?.splice(index, 1); })}>×</button>}</div>)}{editable && <button type="button" disabled={busy} onClick={() => change(format => { const stage = format.stages[stageIndex]; const values = groupIndex === undefined ? stage.inputs : stage.groups?.[groupIndex].inputs; const available = options(stageIndex).find(option => !values?.some(value => JSON.stringify(value) === JSON.stringify(option))); if (values && available) values.push(available); })}><Plus size={15} />Thêm vị trí</button>}</div>;
  if (!event || !draft) return <section className="op-panel"><h2>Thể thức</h2><p>{error || "Đang tải cấu hình…"}</p></section>;
  const picked = preview.matches.find(match => match.id === selectedMatch);
  return <section className="fb-shell" aria-label="Dựng thể thức giải">
    <header className="fb-header"><div><h2>Thể thức · {event.name}</h2><p>{event.lockedAt ? "Đã chốt · cấu trúc được khóa" : "Dựng nhánh trước. Chỉnh cấu hình cạnh nhánh."}</p></div><div>{editable && <><motion.button type="button" disabled={busy || !!preview.problem || !dirty} whileTap={{ scale: .98 }} onClick={() => void save()}><Save size={17} />Lưu thể thức</motion.button><motion.button type="button" className="op-primary" disabled={busy || dirty || !!preview.problem} whileTap={{ scale: .98 }} onClick={() => void save(true)}><LockKeyhole size={17} />Chốt một lần</motion.button></>}</div></header>
    {error && <p role="alert" className="op-error">{error}</p>}{notice && <p role="status" className="op-notice">{notice}</p>}
    <div className="fb-layout"><div className="fb-canvas"><p className="fb-caption">{preview.matches.length} trận dự kiến · seed sẽ được xác định sau giai đoạn trước</p>{preview.problem ? <div className="fb-warning" role="status"><h3>Hoàn thiện cấu hình</h3><p>{preview.problem}</p><p>Đăng ký đội trước. Mỗi bảng cần ít nhất hai nguồn đội.</p></div> : draft.stages.map(stage => <section className="fb-stage" key={stage.id}><h3>{stage.name}</h3><div className="fb-rounds">{[...new Set(preview.matches.filter(match => match.stageId === stage.id).map(match => `${match.branch}:${match.round}`))].map(column => { const [branch, round] = column.split(":"); return <div className="fb-round" key={column}><h4>{branches[branch]} · {round}</h4>{preview.matches.filter(match => match.stageId === stage.id && match.branch === branch && String(match.round) === round).map(match => <motion.button type="button" key={match.id} className="fb-match" aria-pressed={selectedMatch === match.id} onClick={() => setSelectedMatch(match.id)} whileTap={{ scale: .98 }}><span>{match.key} · BO{match.bo}{match.condition ? " · Nếu reset" : ""}</span>{match.sources.map((source, index) => <strong key={index}>{label(source)}</strong>)}</motion.button>)}</div>; })}</div></section>)}</div>
    <aside className="fb-settings op-panel"><h3>Cấu hình</h3>{editable && <><div className="fb-presets">{(["demo", "round_robin", "single_elimination", "double_elimination"] as const).map(type => <button key={type} type="button" disabled={busy} onClick={() => choosePreset(type)}>{type === "demo" ? "8 đội · bảng + loại kép" : titles[type]}</button>)}</div><p>Preset thay cấu hình đang chỉnh. Lưu để giữ thay đổi.</p></>}
    {picked && <section className="fb-picked"><h4>{picked.id}</h4><label>BO riêng trận<select disabled={!editable || busy} value={picked.bo} onChange={event => change(format => { const stage = format.stages.find(stage => stage.id === picked.stageId); if (stage) stage.matchBo = { ...stage.matchBo, [picked.key]: Number(event.target.value) }; })}>{[1, 3, 5].map(value => <option key={value} value={value}>BO{value}</option>)}</select></label></section>}
    {draft.stages.map((stage, stageIndex) => <details key={stage.id} open className="fb-stage-editor"><summary>{stageIndex + 1}. {stage.name}</summary><label>Tên giai đoạn<input disabled={!editable || busy} maxLength={80} value={stage.name} onChange={event => patchStage(stageIndex, { name: event.target.value })} /></label><p>{titles[stage.type]}</p><label>BO mặc định<select disabled={!editable || busy} value={stage.bo} onChange={event => patchStage(stageIndex, { bo: Number(event.target.value) })}>{[1, 3, 5].map(value => <option key={value} value={value}>BO{value}</option>)}</select></label>
    {stage.type === "round_robin" ? <><label>Số lượt<select disabled={!editable || busy} value={stage.rounds} onChange={event => patchStage(stageIndex, { rounds: Number(event.target.value) })}><option value={1}>Một lượt</option><option value={2}>Lượt đi và về</option></select></label>{stage.groups?.map((group, groupIndex) => <section key={group.id}><label>Tên bảng<input disabled={!editable || busy} value={group.name} onChange={event => change(format => { format.stages[stageIndex].groups![groupIndex].name = event.target.value; })} /></label>{inputEditor(stageIndex, group.inputs, groupIndex)}{editable && <button type="button" disabled={busy} onClick={() => change(format => { format.stages[stageIndex].groups?.splice(groupIndex, 1); })}>Bỏ bảng</button>}</section>)}{editable && <><button type="button" disabled={busy} onClick={() => change(format => { const groups = format.stages[stageIndex].groups!; const available = options(stageIndex).filter(option => !groups.some(group => group.inputs.some(value => JSON.stringify(value) === JSON.stringify(option)))); groups.push({ id: `G${crypto.randomUUID().slice(0, 6)}`, name: `Bảng ${groups.length + 1}`, inputs: available.slice(0, 2) }); })}><Plus size={15} />Thêm bảng</button><button type="button" disabled={busy} onClick={() => shuffle(stageIndex)}><Shuffle size={15} />Trộn đội giữa các bảng</button></>}</> : <><label>BO chung kết<select disabled={!editable || busy} value={stage.finalBo} onChange={event => patchStage(stageIndex, { finalBo: Number(event.target.value) })}>{[1, 3, 5].map(value => <option key={value} value={value}>BO{value}</option>)}</select></label>{stage.type === "double_elimination" && <label>Chung kết reset<select disabled={!editable || busy} value={String(stage.reset)} onChange={event => patchStage(stageIndex, { reset: event.target.value === "true" })}><option value="true">Có · giữ hai lần thua</option><option value="false">Không reset</option></select></label>}{inputEditor(stageIndex, stage.inputs || [])}</>}{editable && <button type="button" disabled={busy} onClick={() => change(format => { format.stages.splice(stageIndex, 1); })}>Bỏ giai đoạn</button>}</details>)}
    {editable && <div className="fb-add-stage"><h4>Thêm giai đoạn</h4>{(Object.keys(titles) as StageType[]).map(type => <button type="button" key={type} disabled={busy} onClick={() => append(type)}><Plus size={15} />{titles[type]}</button>)}</div>}
    </aside></div>
  </section>;
}
