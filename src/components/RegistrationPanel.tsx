import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, LockKeyhole, RefreshCw, Users } from "lucide-react";
import { api } from "../lib/api";
import type { Player, Registration, Team, Tournament } from "../lib/api";
import "./RegistrationPanel.css";

export default function RegistrationPanel({ event, teams, players, onSaved, onOpenTeam }: { event: Tournament; teams: Team[]; players: Player[]; onSaved: () => Promise<void>; onOpenTeam?: (teamId: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [teamId, setTeamId] = useState("");
  const [base, setBase] = useState<Registration | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const drafts = useRef(new Map<string, { base: Registration | null; selected: string[]; reason: string }>());
  const reduced = useReducedMotion();
  const current = event.registrations.find(item => item.team.id === teamId);
  const locked = Boolean(current?.lockedAt || base?.lockedAt);
  const changed = (current?.revision || 0) !== (base?.revision || 0) || Boolean(current?.lockedAt) !== Boolean(base?.lockedAt);
  const assigned = new Set(event.registrations.flatMap(item => item.players.map(player => player.id)));
  const candidates = players.filter(player => !player.archived && (!locked || !assigned.has(player.id)));
  function choose(id: string, source = event, discard = false) {
    setEditing(true);
    if (!discard && id === teamId) return;
    if (!discard && teamId) drafts.current.set(teamId, { base, selected, reason });
    if (discard) drafts.current.delete(id);
    const registration = source.registrations.find(item => item.team.id === id) || null;
    const cached = drafts.current.get(id);
    setTeamId(id); setBase(cached ? cached.base : registration); setSelected(cached ? cached.selected : registration?.lockedAt ? [] : registration?.players.map(player => player.id) || []);
    setReason(cached?.reason || ""); setError(""); setNotice("");
  }
  function toggle(id: string) { setSelected(values => values.includes(id) ? values.filter(value => value !== id) : [...values, id]); }
  async function reload() {
    setBusy(true); setError("");
    try { const fresh = await api<{ tournament: Tournament }>(`/tournaments/${event.id}`); await onSaved(); choose(teamId, fresh.tournament, true); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Chưa tải được đăng ký."); }
    finally { setBusy(false); }
  }
  async function submit(form: FormEvent) {
    form.preventDefault(); if (!teamId || changed) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const path = `/tournaments/${event.id}/registrations${locked ? `/${teamId}/additions` : ""}`;
      const result = await api<{ registration: Registration }>(path, { teamId, playerIds: selected, revision: base?.revision || 0, ...(locked ? { reason } : {}) });
      drafts.current.delete(teamId);
      setBase(result.registration); setSelected(locked ? [] : result.registration.players.map(player => player.id)); setReason("");
      setNotice(locked ? "Đã duyệt bổ sung. Tuyển thủ có thể chọn trong đội hình game." : "Đã lưu đăng ký của đội.");
      try { await onSaved(); } catch { setError("Đã lưu. Chưa tải được danh sách mới. Tải lại đăng ký để xem."); }
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể lưu đăng ký."); }
    finally { setBusy(false); }
  }
  return <section className="op-panel op-registration"><h2><Users size={20} /> Đăng ký · {event.name}</h2><p>Đội tuyển và danh sách đăng ký của giải.</p>
    {error && <p role="alert" className="op-error">{error}</p>}{notice && <p role="status" className="op-notice">{notice}</p>}
    <div className="op-inline-actions"><button type="button" disabled={busy} onClick={() => choose("")}>Đăng ký đội</button>{editing && <button type="button" disabled={busy} onClick={() => setEditing(false)}>Đóng chỉnh sửa</button>}</div>
    <div className={editing ? "op-grid" : ""}>{editing && <form onSubmit={submit}><label>Đội đăng ký<select required value={teamId} disabled={busy} onChange={change => choose(change.target.value)}><option value="">Chọn đội</option>{teams.filter(team => !team.archived || event.registrations.some(item => item.team.id === team.id)).filter(team => !event.lockedAt || event.registrations.some(item => item.team.id === team.id)).map(team => <option key={team.id} value={team.id}>{event.registrations.find(item => item.team.id === team.id)?.team.name || team.name}</option>)}</select></label>
      {changed && <p role="alert" className="op-error">Đăng ký đã đổi. Bản đang nhập giữ nguyên. Tải lại trước khi lưu.</p>}
      {locked && <motion.div className="rp-locked" initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}><h3><LockKeyhole size={18} /> Danh sách đã khóa</h3><p>{(current || base)?.players.map(player => player.handle).join(" · ") || "Chưa có tuyển thủ"}</p><p>Chỉ thêm người. Giữ danh sách và game cũ.</p></motion.div>}
      {teamId && <fieldset disabled={busy || changed}><legend>{locked ? "Tuyển thủ cần duyệt bổ sung" : "Tuyển thủ của đội"}</legend>{candidates.length ? <div className="op-player-options">{candidates.map(player => <label key={player.id}><input type="checkbox" checked={selected.includes(player.id)} onChange={() => toggle(player.id)} /><span>{player.handle}{player.name && <small>{player.name}</small>}</span></label>)}</div> : <p>{locked ? "Chưa có tuyển thủ chưa đăng ký. Thêm người trong danh bạ." : "Thêm tuyển thủ trong danh bạ trước."}</p>}</fieldset>}
      {locked && <label>Lý do duyệt<textarea required maxLength={1000} rows={3} value={reason} disabled={busy || changed} onChange={change => setReason(change.target.value)} placeholder="Ví dụ: duyệt tuyển thủ dự bị theo đăng ký bổ sung của đội." /></label>}
      <motion.button className="op-primary" type="submit" disabled={busy || !teamId || changed || (locked && (!selected.length || !reason.trim()))} whileTap={reduced ? undefined : { scale: .98 }}>{busy ? "Đang lưu…" : locked ? "Duyệt bổ sung" : "Lưu đăng ký"}<Check size={17} /></motion.button>
      {teamId && <button type="button" disabled={busy} onClick={() => void reload()}><RefreshCw size={17} /> Tải lại đăng ký</button>}
    </form>}<div className="op-registered-list">{event.registrations.length ? event.registrations.map(item => <article key={item.team.id}><h3>{onOpenTeam ? <button type="button" onClick={() => onOpenTeam(item.team.id)}>{item.team.name}</button> : item.team.name} <span>{item.team.tag}</span></h3><p>{item.players.map(player => player.handle).join(" · ") || "Chưa đăng ký tuyển thủ"}</p><small>{item.lockedAt ? "Đã khóa · cần duyệt để bổ sung" : "Chưa khóa · được chỉnh đăng ký"}</small><button type="button" disabled={busy} onClick={() => choose(item.team.id)}>{item.lockedAt ? "Duyệt bổ sung" : "Chỉnh đăng ký"}</button></article>) : <p>Chưa có đội trong giải này.</p>}</div></div>
  </section>;
}
