import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { CalendarDays, Check, RefreshCw, Save, Send } from "lucide-react";
import { api } from "../lib/api";
import type { Game, GameData, Match, Tournament } from "../lib/api";
import type { Source } from "../../shared/format.mjs";
import "./MatchOperations.css";

const states = { waiting: "Chờ đội", ready: "Sắp đấu", in_progress: "Đang đấu", completed: "Đã xong", skipped: "Không cần đấu" };
const gameStates = { draft: "Nháp", submitted: "Chờ xác nhận", confirmed: "Đã xác nhận" };
const pickFields = { bluePicks: "Xanh chọn", redPicks: "Đỏ chọn", blueBans: "Xanh cấm", redBans: "Đỏ cấm" };
type PickText = Partial<Record<keyof typeof pickFields, string>>;

export default function MatchOperations({ tournamentId, revision }: { tournamentId: string; revision?: number }) {
  const [event, setEvent] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [number, setNumber] = useState(1);
  const [draft, setDraft] = useState<GameData>({});
  const [baseGame, setBaseGame] = useState<Game | null>(null);
  const [pickText, setPickText] = useState<PickText>({});
  const draftCache = useRef(new Map<string, { data: GameData; game: Game | null; text: PickText }>());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [scheduledIds, setScheduledIds] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [interval, setInterval] = useState(0);
  const match = matches.find(item => item.id === selectedId);
  const canEnter = event?.roles.includes("entry");
  const canConfirm = event?.roles.includes("operator");
  const gameEditable = canEnter && (!baseGame || baseGame.state === "draft") && match && ["ready", "in_progress"].includes(match.status);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseGame?.data || {});
  function open(item: Match, gameNumber?: number, discard = false) {
    const last = item.games.at(-1);
    const next = gameNumber || (last && last.state !== "confirmed" ? last.number : item.status === "completed" ? last?.number || 1 : (last?.number || 0) + 1);
    if (!discard && item.id === selectedId && next === number) return;
    if (!discard && selectedId) {
      const key = `${selectedId}/${number}`;
      if (dirty) draftCache.current.set(key, { data: structuredClone(draft), game: baseGame, text: pickText });
      else draftCache.current.delete(key);
    }
    const key = `${item.id}/${next}`;
    if (discard) draftCache.current.delete(key);
    const current = item.games.find(game => game.number === next) || null;
    const cached = draftCache.current.get(key);
    setSelectedId(item.id); setNumber(next); setBaseGame(cached ? cached.game : current); setDraft(structuredClone(cached?.data || current?.data || {}));
    setPickText(cached?.text || Object.fromEntries(Object.entries(current?.data.pickBan || {}).map(([field, values]) => [field, values.join(", ")])));
    setError(cached && (cached.game?.revision || 0) !== (current?.revision || 0) ? "Game đã được người khác sửa. Bản chưa lưu giữ nguyên. Tải lại trận trước khi sửa tiếp." : ""); setNotice("");
  }
  useEffect(() => {
    let current = true;
    void Promise.all([api<{ tournament: Tournament }>(`/tournaments/${tournamentId}`), api<{ matches: Match[] }>(`/tournaments/${tournamentId}/matches`)]).then(([tournament, list]) => {
      if (!current) return;
      setEvent(tournament.tournament); setMatches(list.matches);
      const first = list.matches.find(item => item.games.some(game => game.state === "submitted")) || list.matches.find(item => item.status === "in_progress" || item.status === "ready");
      if (first && !selectedId) open(first);
    }).catch(problem => { if (current) setError(problem.message); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [tournamentId, revision]);
  function teamName(id: string | null) { return event?.registrations.find(item => item.team.id === id)?.team.name || "Chưa xác định"; }
  function sourceName(source: Source) {
    if (source.kind === "team") return teamName(source.teamId);
    if (source.kind === "seed") return `${source.groupId}${source.rank}`;
    if (source.kind === "placement") return `${source.stageId} · hạng ${source.rank}`;
    return `${source.kind === "winner" ? "Thắng" : "Thua"} ${source.matchId}`;
  }
  async function reload(discard = false) {
    const [result, tournament] = await Promise.all([api<{ matches: Match[] }>(`/tournaments/${tournamentId}/matches`), api<{ tournament: Tournament }>(`/tournaments/${tournamentId}`)]);
    setEvent(tournament.tournament);
    setMatches(result.matches);
    if (discard) { const current = result.matches.find(item => item.id === selectedId); if (current) open(current, number, true); }
    return result.matches;
  }
  async function gameCommand(action: "save" | "submit" | "confirm") {
    if (!match) return;
    setBusy(true); setError(""); setNotice("");
    const path = `/tournaments/${tournamentId}/matches/${encodeURIComponent(match.id)}/games/${number}`;
    let saved = false;
    try {
      let revision = baseGame?.revision || 0;
      if (action === "save" || (action === "submit" && (!baseGame || dirty))) {
        const result = await api<{ game: Game }>(`${path}/save`, { revision, data: draft });
        revision = result.game.revision; setBaseGame(result.game); setDraft(result.game.data); saved = true;
      }
      if (action !== "save") {
        const result = await api<{ game: Game }>(`${path}/${action}`, { revision }); setBaseGame(result.game);
      }
      setNotice(action === "confirm" ? "Đã xác nhận. Điểm chính thức được cập nhật." : action === "submit" ? "Đã gửi game. Chờ điều hành xác nhận." : "Đã lưu nháp.");
      try { await reload(); } catch { setError("Đã lưu thao tác. Chưa tải được điểm mới. Tải lại trận."); }
    } catch (problem) { setError(`${saved ? "Đã lưu nháp. " : ""}${problem instanceof Error ? problem.message : "Không thể lưu game."}`); }
    finally { setBusy(false); }
  }
  async function schedule(clear = false) {
    setBusy(true); setError(""); setNotice("");
    try {
      const selected = ordered.filter(item => scheduledIds.includes(item.id));
      if (!selected.length || (!clear && (!date || !Number.isFinite(new Date(date).getTime())))) throw new Error("Chọn trận và ngày giờ trước khi lưu lịch.");
      const updates = selected.map((item, index) => ({ matchId: item.id, revision: item.revision, scheduledAt: clear ? null : new Date(new Date(date).getTime() + index * interval * 60000).toISOString() }));
      const result = await api<{ matches: Match[] }>(`/tournaments/${tournamentId}/schedule`, { updates }); setMatches(result.matches); setScheduledIds([]); setNotice(clear ? "Đã xóa lịch của các trận đã chọn." : "Đã lưu lịch. Thể thức giữ nguyên.");
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể đặt lịch."); }
    finally { setBusy(false); }
  }
  const priority = (item: Match) => item.games.some(game => game.state === "submitted") ? 0 : item.status === "in_progress" ? 1 : item.status === "ready" ? 2 : item.status === "waiting" ? 3 : 4;
  const ordered = [...matches].sort((a, b) => priority(a) - priority(b) || (a.scheduledAt || "9999").localeCompare(b.scheduledAt || "9999"));
  const patch = (value: Partial<GameData>) => setDraft(current => ({ ...current, ...value }));
  return <section className="mo-shell" aria-label="Vận hành trận đấu"><header className="mo-header"><div><h2>Vận hành trận đấu</h2><p>Ưu tiên game chờ xác nhận và trận đang đấu.</p></div><button type="button" disabled={busy} onClick={() => { setBusy(true); void reload(true).catch(problem => setError(problem.message)).finally(() => setBusy(false)); }}><RefreshCw size={17} />Tải lại trận · bỏ phần chưa lưu</button></header>
    {error && <p role="alert" className="op-error">{error}</p>}{notice && <p role="status" className="op-notice">{notice}</p>}
    {canConfirm && <details className="op-panel mo-schedule"><summary><CalendarDays size={18} />Đặt lịch · {scheduledIds.length} trận đã chọn</summary><p>Chọn ô cạnh trận. Đặt từng trận hoặc nhiều trận. Giờ dùng múi giờ thiết bị. Các trận theo thứ tự trong danh sách.</p><div className="mo-schedule-fields"><label>Ngày giờ trận đầu<input type="datetime-local" value={date} disabled={busy} onChange={event => setDate(event.target.value)} /></label><label>Cách nhau bao nhiêu phút<input type="number" min={0} max={1440} value={interval} disabled={busy} onChange={event => setInterval(Math.max(0, Math.min(1440, Number(event.target.value))))} /></label><button type="button" disabled={busy || !scheduledIds.length} onClick={() => void schedule()}>Lưu lịch</button><button type="button" disabled={busy || !scheduledIds.length} onClick={() => void schedule(true)}>Xóa lịch đã chọn</button></div></details>}
    <div className="mo-layout"><div className="mo-list" aria-label="Danh sách trận">{loading ? <p role="status">Đang tải trận đấu…</p> : ordered.length ? ordered.map(item => <article key={item.id} className={selectedId === item.id ? "mo-selected" : ""}>{canConfirm && <label className="mo-schedule-check"><input type="checkbox" checked={scheduledIds.includes(item.id)} disabled={busy} onChange={() => setScheduledIds(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])} /><span>Chọn lịch {item.id}</span></label>}<motion.button type="button" disabled={busy} onClick={() => open(item)} whileTap={{ scale: .99 }}><span className="mo-match-title">{item.id} · BO{item.bo}<small>{item.games.some(game => game.state === "submitted") ? "Chờ xác nhận" : states[item.status]}</small></span><strong>{item.teams[0] ? teamName(item.teams[0]) : sourceName(item.sources[0])}<b>{item.score[0]}</b></strong><strong>{item.teams[1] ? teamName(item.teams[1]) : sourceName(item.sources[1])}<b>{item.score[1]}</b></strong><span className="mo-date">{item.scheduledAt ? new Date(item.scheduledAt).toLocaleString("vi-VN") : "Chưa đặt lịch"}</span></motion.button></article>) : <p>Chốt thể thức để tạo các trận đấu.</p>}</div>
    <section className="op-panel mo-game">{match ? <><h3>{match.id} · Game {number}</h3><p>{baseGame ? gameStates[baseGame.state] : "Game mới"}{dirty ? " · Có thay đổi chưa lưu" : ""}</p><div className="mo-game-tabs">{match.games.map(game => <button key={game.number} type="button" disabled={busy} aria-pressed={game.number === number} onClick={() => open(match, game.number)}>Game {game.number} · {gameStates[game.state]}</button>)}{["ready", "in_progress"].includes(match.status) && (!match.games.length || match.games.at(-1)?.state === "confirmed") && <button type="button" disabled={busy} onClick={() => open(match, (match.games.at(-1)?.number || 0) + 1)}>Game tiếp theo</button>}</div>
    {!match.teams.every(Boolean) || ["waiting", "skipped"].includes(match.status) ? <p>Trận chưa đủ đội hoặc chưa cần diễn ra.</p> : <form onSubmit={event => { event.preventDefault(); void gameCommand("submit"); }}><fieldset disabled={busy || !gameEditable}><legend>Kết quả game</legend><label>Đội thắng<select value={draft.winnerId || ""} onChange={event => patch({ winnerId: event.target.value || undefined })}><option value="">Chưa chọn · vẫn lưu được nháp</option>{match.teams.map(id => <option key={id} value={id || ""}>{teamName(id)}</option>)}</select></label></fieldset>
    <details className="mo-optional"><summary>Thông tin tùy chọn</summary><fieldset disabled={busy || !gameEditable}><legend>Dữ liệu game</legend><label>Thời lượng · giây<input type="number" min={0} max={86400} value={draft.durationSeconds ?? ""} onChange={event => patch({ durationSeconds: event.target.value === "" ? undefined : Number(event.target.value) })} /></label><label>Phiên bản game<input maxLength={40} value={draft.patch || ""} onChange={event => patch({ patch: event.target.value || undefined })} /></label>{(["blueTeamId", "redTeamId"] as const).map(field => <label key={field}>{field === "blueTeamId" ? "Bên xanh" : "Bên đỏ"}<select value={draft[field] || ""} onChange={event => patch({ [field]: event.target.value || undefined })}><option value="">Chưa nhập</option>{match.teams.map(id => <option key={id} value={id || ""}>{teamName(id)}</option>)}</select></label>)}
    {match.teams.map(id => <section key={id}><h4>Đội hình · {teamName(id)}</h4><div className="op-player-options">{event?.registrations.find(item => item.team.id === id)?.players.map(player => <label key={player.id}><input type="checkbox" checked={draft.lineups?.[id || ""]?.includes(player.id) || false} onChange={() => { if (!id) return; const players = draft.lineups?.[id] || []; patch({ lineups: { ...draft.lineups, [id]: players.includes(player.id) ? players.filter(value => value !== player.id) : [...players, player.id] } }); }} /><span>{player.handle}</span></label>)}</div></section>)}{(Object.keys(pickFields) as (keyof typeof pickFields)[]).map(field => <label key={field}>{pickFields[field]}<input placeholder="Ahri, Jinx…" value={pickText[field] || ""} onChange={event => { setPickText(current => ({ ...current, [field]: event.target.value })); patch({ pickBan: { ...draft.pickBan, [field]: event.target.value.split(",").map(value => value.trim()).filter(Boolean) } }); }} /></label>)}<small>Tên tướng cách nhau bằng dấu phẩy. Tối đa 5 tướng mỗi ô.</small></fieldset></details>
    <div className="mo-actions">{gameEditable && <><motion.button type="button" disabled={busy} whileTap={{ scale: .98 }} onClick={() => void gameCommand("save")}><Save size={17} />Lưu nháp</motion.button><motion.button type="submit" className="op-primary" disabled={busy || !draft.winnerId} whileTap={{ scale: .98 }}><Send size={17} />Gửi kết quả</motion.button></>}{canConfirm && baseGame?.state === "submitted" && <motion.button type="button" className="op-primary" disabled={busy} whileTap={{ scale: .98 }} onClick={() => void gameCommand("confirm")}><Check size={17} />Xác nhận game</motion.button>}</div></form>}</> : <><h3>{loading ? "Đang tải game…" : "Chọn trận để bắt đầu"}</h3><p>Dữ liệu chỉ tính điểm sau khi điều hành xác nhận.</p></>}</section></div>
  </section>;
}
