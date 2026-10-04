import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { api } from "../lib/api";
import type { GameData, Match, Tournament } from "../lib/api";
import GameFacts from "./GameFacts";
import { matchReference } from "../lib/competition-labels";
import "./MatchChange.css";

export type ChangeKind = "game_edit" | "game_walkover" | "match_walkover";
type Preview = { before: Match; after: Match; affected: { id: string; startedAt: string | null; before: { teams: (string | null)[] }; after: { teams: (string | null)[] } }[]; newMatches: { id: string; sources: { teamId: string }[] }[]; blocked: boolean; previewToken: string | null };
const titles = { game_edit: "Sửa game đã xác nhận", game_walkover: "Xử thắng game", match_walkover: "Xử thắng cả trận" };

export default function MatchChange({ event, match, number, gameRevision, data, kind, busy, onBusy, onApplied, onCancel }: { event: Tournament; match: Match; number: number; gameRevision: number; data: GameData; kind: ChangeKind; busy: boolean; onBusy: (value: boolean) => void; onApplied: () => Promise<void>; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();
  const initialMatchRevision = useRef(match.revision);
  const initialGameRevision = useRef(gameRevision);
  const teamName = (id: string | null) => event.registrations.find(item => item.team.id === id)?.team.name || "Chưa xác định";
  const command = { kind, matchRevision: initialMatchRevision.current, number, gameRevision: initialGameRevision.current, reason, ...(kind === "game_edit" ? { data } : { winnerId }) };
  const commandKey = JSON.stringify(command);
  useEffect(() => { setPreview(null); }, [commandKey]);
  async function act(apply = false) {
    onBusy(true); setError("");
    try {
      const path = `/tournaments/${event.id}/matches/${encodeURIComponent(match.id)}/changes`;
      if (apply) {
        await api(`${path}/apply`, { ...command, previewToken: preview?.previewToken });
        setPreview(null);
        try { await onApplied(); } catch { setError("Đã lưu quyết định. Chưa tải được dữ liệu mới. Tải lại trận."); }
      } else setPreview(await api<Preview>(`${path}/preview`, command));
    } catch (problem) { setPreview(null); setError(problem instanceof Error ? problem.message : "Không thể sửa kết quả."); }
    finally { onBusy(false); }
  }
  return <section className="mc-panel" aria-label={titles[kind]}><h4>{titles[kind]}</h4>{kind === "game_edit" ? <p>Chỉnh kết quả hoặc thông tin trong ô game phía trên. Xem trước trước khi xác nhận.</p> : <label>Đội được xử thắng<select value={winnerId} disabled={busy} onChange={event => setWinnerId(event.target.value)}><option value="">Chọn đội</option>{match.teams.map(id => <option key={id} value={id || ""}>{teamName(id)}</option>)}</select></label>}
    <label>Lý do<textarea rows={3} maxLength={1000} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} placeholder="Ví dụ: nhập nhầm đội thắng, đối thủ bỏ cuộc…" /></label>
    {error && <p className="op-error" role="alert">{error}</p>}
    <div className="mc-actions"><button type="button" disabled={busy || !reason.trim() || !(kind === "game_edit" ? data.winnerId : winnerId)} onClick={() => void act()}>Xem trước ảnh hưởng</button><button type="button" disabled={busy} onClick={onCancel}>Hủy sửa · bỏ thay đổi</button></div>
    {preview && <section className="mc-preview" aria-label="Xem trước thay đổi"><h4>{preview.blocked ? "Không thể đổi kết quả" : "Kiểm tra trước khi lưu"}</h4><p>Đội thắng trận: {teamName(preview.before.winnerId)} → {teamName(preview.after.winnerId)}</p>{kind !== "match_walkover" && <div className="mc-comparison">{(["before", "after"] as const).map(side => { const game = preview[side].games.find(game => game.number === number); return <section key={side}><h4>{side === "before" ? "Game trước" : "Game sau"}</h4>{game ? <GameFacts game={game} event={event} /> : <p>Chưa có game.</p>}</section>; })}</div>}<p>{preview.affected.length ? `${preview.affected.length} trận bị ảnh hưởng.` : "Không đổi đội ở trận sau."}</p>{preview.affected.length > 0 && <ul>{preview.affected.map(item => <li key={item.id}><strong>{matchReference(event, item.id)}</strong> · {item.before.teams.map(teamName).join(" / ")} → {item.after.teams.map(teamName).join(" / ")}{item.startedAt && <b> · Đã bắt đầu</b>}</li>)}</ul>}{preview.newMatches.length > 0 && <div><p>{preview.newMatches.length} trận phụ BO1 mới sẽ được tạo.</p><ul>{preview.newMatches.map(item => <li key={item.id}>{item.sources.map(source => teamName(source.teamId)).join(" / ")}</li>)}</ul></div>}{preview.blocked ? <p role="alert">Trận sau bị ảnh hưởng đã bắt đầu. Có thể sửa thông tin game nếu giữ đội thắng.</p> : <motion.button type="button" className="op-primary" disabled={busy || !preview.previewToken} whileTap={reduced ? undefined : { scale: .98 }} onClick={() => void act(true)}>Xác nhận lưu thay đổi</motion.button>}</section>}
  </section>;
}
