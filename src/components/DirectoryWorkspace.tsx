import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ArrowLeft, ArrowRight, Check, Plus, Pencil } from "lucide-react";
import { api } from "../lib/api";
import type { Account, Player, Team, Tournament } from "../lib/api";
import TournamentGrants from "./TournamentGrants";
import FormatBuilder from "./FormatBuilder";
import MatchOperations from "./MatchOperations";
import RegistrationPanel from "./RegistrationPanel";

type EventSection = "overview" | "matches" | "registration" | "format" | "grants";

export default function DirectoryWorkspace({ admin = false, accounts, directoryOnly = false }: { admin?: boolean; accounts?: Account[]; directoryOnly?: boolean }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState("");
  const [section, setSection] = useState<EventSection>("overview");
  const [visited, setVisited] = useState<EventSection[]>(["overview"]);
  function openSection(value: EventSection) { setSection(value); setVisited(current => current.includes(value) ? current : [...current, value]); }
  const [creating, setCreating] = useState(false);
  const [addingTeam, setAddingTeam] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);
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

  async function refresh() {
    const [directory, events] = await Promise.all([api<{ teams: Team[]; players: Player[] }>("/directory"), api<{ tournaments: Tournament[] }>("/tournaments")]);
    setTeams(directory.teams); setPlayers(directory.players); setTournaments(events.tournaments);
    setSelected(current => events.tournaments.some(item => item.id === current) ? current : "");
  }
  useEffect(() => { let current = true; void refresh().catch(problem => { if (current) setError(problem.message); }).finally(() => { if (current) setLoading(false); }); return () => { current = false; }; }, []);

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
    void save(`/${kind}${record ? `/${record.id}` : ""}`, { name: data.get("name"), [kind === "teams" ? "tag" : "handle"]: data.get("identity"), ...(record ? { revision: record.revision } : {}) }, record ? "Đã cập nhật danh bạ. Đăng ký giải cũ giữ nguyên." : "Đã thêm vào danh bạ.", () => { if (kind === "teams") { setEditingTeam(null); setAddingTeam(false); } else { setEditingPlayer(null); setAddingPlayer(false); } form.reset(); });
  }
  function createTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
    void save("/tournaments", { name: data.get("name") }, "Đã tạo giải. Chọn giải để bắt đầu.", () => { form.reset(); setCreating(false); });
  }
  const submit = (label: string) => <motion.button className="op-primary" type="submit" disabled={busy} whileTap={{ scale: .98 }}>{busy ? "Đang lưu…" : label}<Check size={17} /></motion.button>;
  return <section className="op-directory" aria-label={directoryOnly ? "Danh bạ" : "Giải đấu"}>
    {error && <p role="alert" className="op-error">{error}</p>}{notice && <p role="status" className="op-notice">{notice}</p>}
    {!directoryOnly && !tournament && <>
      <div className="op-view-heading"><h1>Giải đấu</h1><button className="op-primary" type="button" disabled={busy} onClick={() => setCreating(true)}><Plus size={18} /> Tạo giải</button></div>
      {creating && <section className="op-panel op-create-event"><h2>Tạo giải</h2><form onSubmit={createTournament}><label>Tên giải<input name="name" required maxLength={120} autoFocus placeholder="Community Cup 2026" /></label><div className="op-inline-actions">{submit("Tạo giải")}<button type="button" disabled={busy} onClick={() => setCreating(false)}>Hủy</button></div></form></section>}
      {loading ? <p role="status">Đang tải giải…</p> : tournaments.length ? <div className="op-tournament-picker" ref={list}>{tournaments.map(item => <button key={item.id} type="button" disabled={busy} onClick={() => { setSelected(item.id); setSection("overview"); setVisited(["overview"]); setNotice(""); setError(""); }}><div><strong>{item.name}</strong><span>{item.registrations.length} đội · {item.lockedAt ? "Đã chốt thể thức" : "Đang chuẩn bị"}</span></div><ArrowRight size={20} /></button>)}</div> : <p>Chưa có giải. Tạo giải để bắt đầu.</p>}
    </>}
    {!directoryOnly && tournament && <>
      <button className="op-back" type="button" disabled={busy} onClick={() => { setSelected(""); setNotice(""); setError(""); }}><ArrowLeft size={17} /> Các giải đấu</button>
      <div className="op-view-heading"><h1>{tournament.name}</h1></div>
      <nav className="op-event-nav" aria-label="Công cụ giải đấu">{([
        ["overview", "Tổng quan"], ["matches", "Trận đấu"],
        ...(tournament.roles.includes("operator") ? [["registration", "Đăng ký"]] : []),
        ["format", "Thể thức"], ...(admin ? [["grants", "Phân quyền"]] : []),
      ] as [EventSection, string][]).map(([value, label]) => <button key={value} type="button" aria-current={section === value ? "page" : undefined} onClick={() => openSection(value)}>{label}</button>)}</nav>
      <motion.div key={tournament.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .15 }}>
        {section === "overview" && <section className="op-panel op-event-overview"><h2>{tournament.lockedAt ? "Giải đã chốt thể thức" : "Giải đang chuẩn bị"}</h2><p>{tournament.registrations.length} đội đã đăng ký.</p><button className="op-primary" type="button" onClick={() => openSection(tournament.lockedAt ? "matches" : tournament.roles.includes("operator") ? "registration" : "format")}>{tournament.lockedAt ? "Xem trận đấu" : tournament.roles.includes("operator") ? "Quản lý đăng ký" : "Xem thể thức"}<ArrowRight size={17} /></button></section>}
        {visited.includes("matches") && <div hidden={section !== "matches"}>{tournament.lockedAt ? <MatchOperations key={`matches-${tournament.id}`} tournamentId={tournament.id} revision={tournament.revision} onEventChanged={refresh} /> : <section className="op-panel"><h2>Chưa có trận đấu</h2><p>Trận đấu xuất hiện sau khi chốt thể thức.</p><button type="button" onClick={() => openSection("format")}>Xem thể thức <ArrowRight size={17} /></button></section>}</div>}
        {visited.includes("format") && <div hidden={section !== "format"}><FormatBuilder key={`format-${tournament.id}`} tournamentId={tournament.id} revision={tournament.revision} onSaved={refresh} /></div>}
        {visited.includes("registration") && tournament.roles.includes("operator") && <div hidden={section !== "registration"}><RegistrationPanel key={`registration-${tournament.id}`} event={tournament} teams={teams} players={players} onSaved={refresh} /></div>}
        {visited.includes("grants") && admin && <div hidden={section !== "grants"}><TournamentGrants key={`grants-${tournament.id}`} tournamentId={tournament.id} organizationAccounts={accounts} /></div>}
      </motion.div>
    </>}
    {directoryOnly && <><div className="op-view-heading"><h1>Danh bạ</h1></div><div className="op-grid"><section className="op-panel"><div className="op-catalog-heading"><h2>Đội tuyển <span className="op-count">{teams.length}</span></h2><button type="button" disabled={busy} onClick={() => { setEditingTeam(null); setAddingTeam(true); }}><Plus size={17} /> Thêm đội</button></div>{(addingTeam || editingTeam) && <form key={editingTeam?.id || "new-team"} onSubmit={event => submitDirectory(event, "teams")}><label>Tên đội<input name="name" required maxLength={80} autoFocus defaultValue={editingTeam?.name || ""} /></label><label>Tên viết tắt<input name="identity" required maxLength={12} defaultValue={editingTeam?.tag || ""} /></label>{submit(editingTeam ? "Lưu đội" : "Thêm đội")}<button type="button" disabled={busy} onClick={() => { setEditingTeam(null); setAddingTeam(false); }}>Hủy</button></form>}<ul className="op-catalog">{teams.map(team => <li key={team.id}><div><strong>{team.name}</strong><span>{team.tag}</span></div><button type="button" disabled={busy} aria-label={`Sửa đội ${team.name}`} onClick={() => setEditingTeam(team)}><Pencil size={16} /> Sửa</button></li>)}</ul></section>
    <section className="op-panel"><div className="op-catalog-heading"><h2>Tuyển thủ <span className="op-count">{players.length}</span></h2><button type="button" disabled={busy} onClick={() => { setEditingPlayer(null); setAddingPlayer(true); }}><Plus size={17} /> Thêm tuyển thủ</button></div>{(addingPlayer || editingPlayer) && <form key={editingPlayer?.id || "new-player"} onSubmit={event => submitDirectory(event, "players")}><label>Tên tuyển thủ<input name="name" required maxLength={80} autoFocus defaultValue={editingPlayer?.name || ""} /></label><label>Tên trong game<input name="identity" required maxLength={80} defaultValue={editingPlayer?.handle || ""} placeholder="Tên#VN2" /></label>{submit(editingPlayer ? "Lưu tuyển thủ" : "Thêm tuyển thủ")}<button type="button" disabled={busy} onClick={() => { setEditingPlayer(null); setAddingPlayer(false); }}>Hủy</button></form>}<ul className="op-catalog">{players.map(player => <li key={player.id}><div><strong>{player.name}</strong><span>{player.handle}</span></div><button type="button" disabled={busy} aria-label={`Sửa tuyển thủ ${player.handle}`} onClick={() => setEditingPlayer(player)}><Pencil size={16} /> Sửa</button></li>)}</ul></section></div></>}
  </section>;
}
