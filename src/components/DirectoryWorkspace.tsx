import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Check, Plus, Pencil, Users } from "lucide-react";
import { api } from "../lib/api";
import type { Player, Team, Tournament } from "../lib/api";
import TournamentGrants from "./TournamentGrants";

export default function DirectoryWorkspace({ admin = false }: { admin?: boolean }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState("");
  const [registerTeam, setRegisterTeam] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [list, enableAnimation] = useAutoAnimate<HTMLDivElement>();
  const reduced = useReducedMotion();
  useEffect(() => enableAnimation(!reduced), [reduced, enableAnimation]);
  const tournament = tournaments.find(item => item.id === selected);
  const registration = tournament?.registrations.find(item => item.team.id === registerTeam);

  async function refresh() {
    const [directory, events] = await Promise.all([api<{ teams: Team[]; players: Player[] }>("/directory"), api<{ tournaments: Tournament[] }>("/tournaments")]);
    setTeams(directory.teams); setPlayers(directory.players); setTournaments(events.tournaments);
    setSelected(current => events.tournaments.some(item => item.id === current) ? current : events.tournaments[0]?.id || "");
  }
  useEffect(() => { let current = true; void refresh().catch(problem => { if (current) setError(problem.message); }).finally(() => { if (current) setLoading(false); }); return () => { current = false; }; }, []);
  function chooseRegistration(teamId: string) {
    setRegisterTeam(teamId);
    setSelectedPlayers(tournament?.registrations.find(item => item.team.id === teamId)?.players.map(player => player.id) || []);
  }

  async function save(path: string, body: object, message: string, after?: () => void) {
    setBusy(true); setError(""); setNotice("");
    try {
      await api(path, body); after?.(); setNotice(message);
      try { await refresh(); }
      catch { setError("Đã lưu. Chưa tải được dữ liệu mới. Tải lại trang để xem."); }
    }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể lưu."); }
    finally { setBusy(false); }
  }
  function submitDirectory(event: FormEvent<HTMLFormElement>, kind: "teams" | "players") {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
    const record = kind === "teams" ? editingTeam : editingPlayer;
    void save(`/${kind}${record ? `/${record.id}` : ""}`, { name: data.get("name"), [kind === "teams" ? "tag" : "handle"]: data.get("identity"), ...(record ? { revision: record.revision } : {}) }, record ? "Đã cập nhật danh bạ. Đăng ký giải cũ giữ nguyên." : "Đã thêm vào danh bạ.", () => { if (kind === "teams") setEditingTeam(null); else setEditingPlayer(null); form.reset(); });
  }
  function createTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
    void save("/tournaments", { name: data.get("name") }, "Đã tạo giải. Thêm đội và danh sách đăng ký.", () => form.reset());
  }
  function togglePlayer(id: string) { setSelectedPlayers(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]); }
  const submit = (label: string) => <motion.button className="op-primary" type="submit" disabled={busy} whileTap={{ scale: .98 }}>{busy ? "Đang lưu…" : label}<Check size={17} /></motion.button>;
  return <section className="op-directory" aria-label="Danh bạ và đăng ký giải">
    {admin && tournament && <TournamentGrants key={tournament.id} tournamentId={tournament.id} />}
    {error && <p role="alert" className="op-error">{error}</p>}{notice && <p role="status" className="op-notice">{notice}</p>}
    <div className="op-grid"><section className="op-panel"><h2><Plus size={20} /> Giải đấu</h2><p>Tạo giải mới. Đăng ký đội và tuyển thủ riêng cho mùa này.</p><form onSubmit={createTournament}><label>Tên giải<input name="name" required maxLength={120} placeholder="Community Cup 2026" /></label>{submit("Tạo giải")}</form></section>
    <section className="op-panel"><h2>Các giải của tổ chức</h2>{loading ? <p>Đang tải…</p> : tournaments.length ? <div className="op-event-list" ref={list}>{tournaments.map(item => <button key={item.id} type="button" disabled={busy} aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setRegisterTeam(""); setSelectedPlayers([]); }}><strong>{item.name}</strong><span>{item.registrations.length} đội · {item.lockedAt ? "Đã chốt" : "Đang chuẩn bị"}</span></button>)}</div> : <p>Chưa có giải. Tạo giải để bắt đầu.</p>}</section></div>
    <div className="op-grid"><section className="op-panel"><h2>Đội tuyển <span className="op-count">{teams.length}</span></h2><form key={editingTeam?.id || "new-team"} onSubmit={event => submitDirectory(event, "teams")}><label>Tên đội<input name="name" required maxLength={80} defaultValue={editingTeam?.name || ""} /></label><label>Tên viết tắt<input name="identity" required maxLength={12} defaultValue={editingTeam?.tag || ""} /></label>{submit(editingTeam ? "Lưu đội" : "Thêm đội")}{editingTeam && <button type="button" disabled={busy} onClick={() => setEditingTeam(null)}>Hủy chỉnh sửa</button>}</form><ul className="op-catalog">{teams.map(team => <li key={team.id}><div><strong>{team.name}</strong><span>{team.tag}</span></div><button type="button" disabled={busy} aria-label={`Sửa đội ${team.name}`} onClick={() => setEditingTeam(team)}><Pencil size={16} /> Sửa</button></li>)}</ul></section>
    <section className="op-panel"><h2>Tuyển thủ <span className="op-count">{players.length}</span></h2><form key={editingPlayer?.id || "new-player"} onSubmit={event => submitDirectory(event, "players")}><label>Tên tuyển thủ<input name="name" required maxLength={80} defaultValue={editingPlayer?.name || ""} /></label><label>Tên trong game<input name="identity" required maxLength={80} defaultValue={editingPlayer?.handle || ""} placeholder="Tên#VN2" /></label>{submit(editingPlayer ? "Lưu tuyển thủ" : "Thêm tuyển thủ")}{editingPlayer && <button type="button" disabled={busy} onClick={() => setEditingPlayer(null)}>Hủy chỉnh sửa</button>}</form><ul className="op-catalog">{players.map(player => <li key={player.id}><div><strong>{player.name}</strong><span>{player.handle}</span></div><button type="button" disabled={busy} aria-label={`Sửa tuyển thủ ${player.handle}`} onClick={() => setEditingPlayer(player)}><Pencil size={16} /> Sửa</button></li>)}</ul></section></div>
    {tournament?.roles.includes("operator") && <section className="op-panel op-registration"><h2><Users size={20} /> Đăng ký · {tournament.name}</h2><p>Thông tin được giữ riêng cho giải. Tuyển thủ chỉ đăng ký cho một đội trong cùng giải.</p><div className="op-grid"><form onSubmit={event => { event.preventDefault(); void save(`/tournaments/${tournament.id}/registrations`, { teamId: registerTeam, playerIds: selectedPlayers, revision: registration?.revision || 0 }, "Đã lưu đăng ký của đội."); }}><label>Đội đăng ký<select required value={registerTeam} disabled={busy} onChange={event => chooseRegistration(event.target.value)}><option value="">Chọn đội</option>{teams.filter(team => !team.archived).map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><fieldset disabled={busy || !registerTeam}><legend>Tuyển thủ của đội</legend>{players.filter(player => !player.archived).length ? <div className="op-player-options">{players.filter(player => !player.archived).map(player => <label key={player.id}><input type="checkbox" checked={selectedPlayers.includes(player.id)} onChange={() => togglePlayer(player.id)} /><span>{player.name}<small>{player.handle}</small></span></label>)}</div> : <p>Thêm tuyển thủ trong danh bạ trước.</p>}</fieldset>{submit("Lưu đăng ký")}</form><div className="op-registered-list">{tournament.registrations.length ? tournament.registrations.map(item => <article key={item.team.id}><h3>{item.team.name} <span>{item.team.tag}</span></h3><p>{item.players.length ? item.players.map(player => player.handle).join(" · ") : "Chưa đăng ký tuyển thủ"}</p><button type="button" disabled={busy} onClick={() => chooseRegistration(item.team.id)}>Chỉnh đăng ký</button></article>) : <p>Chưa có đội trong giải này.</p>}</div></div></section>}
  </section>;
}
