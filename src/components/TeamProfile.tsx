import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { api } from "../lib/api";
import type { Player, TeamProfileData, Tournament } from "../lib/api";
import "./TeamProfile.css";

export default function TeamProfile({ teamId, tournamentId, tournaments, players = [], onBack, onSaved, onOpenMatch, renderMediaEditor }: { teamId: string; tournamentId?: string; tournaments: Tournament[]; players?: Player[]; onBack: () => void; onSaved?: () => Promise<void>; onOpenMatch?: (tournamentId: string, matchId: string) => void; renderMediaEditor?: (profile: TeamProfileData, refresh: () => Promise<void>) => ReactNode }) {
  const [selected, setSelected] = useState(tournamentId || "");
  const [profile, setProfile] = useState<TeamProfileData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [source, setSource] = useState("new");
  const [editing, setEditing] = useState(false);
  const profilePath = selected ? `/tournaments/${selected}/teams/${teamId}/profile` : `/teams/${teamId}/profile`;
  async function refresh() { const result = await api<{ profile: TeamProfileData }>(profilePath); setProfile(result.profile); }
  useEffect(() => { let current = true; setProfile(null); setError(""); setAdding(false); setEditing(false); void api<{ profile: TeamProfileData }>(profilePath).then(result => { if (current) setProfile(result.profile); }).catch(problem => { if (current) setError(problem.message); }); return () => { current = false; }; }, [profilePath]);
  async function save(event: FormEvent<HTMLFormElement>, kind: "member" | "team") {
    event.preventDefault(); if (!profile) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError(""); setNotice("");
    try {
      if (kind === "member") await api(`/tournaments/${selected}/teams/${teamId}/members`, { revision: profile.registration?.revision || 0, ...(source === "new" ? { player: { handle: data.get("handle"), name: data.get("name"), position: data.get("position") } } : { playerId: data.get("playerId") }), ...(profile.registration?.lockedAt ? { reason: data.get("reason") } : {}) });
      else await api(`/teams/${teamId}`, { name: data.get("name"), tag: data.get("tag"), description: data.get("description"), revision: profile.directoryTeam?.revision });
      setAdding(false); setEditing(false); setNotice(kind === "member" ? "Đã thêm thành viên." : "Đã lưu danh bạ. Đăng ký cũ giữ nguyên.");
      try { await refresh(); await onSaved?.(); } catch { setError("Đã lưu. Chưa tải được dữ liệu mới. Tải lại hồ sơ."); }
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể lưu."); }
    finally { setBusy(false); }
  }
  const assigned = new Set(tournaments.find(event => event.id === selected)?.registrations.flatMap(item => item.players.map(player => player.id)) || []);
  const candidates = players.filter(player => !player.archived && !assigned.has(player.id));
  const canSelectDirectory = Boolean(profile?.canManage);
  return <section className="tp-profile" aria-label="Hồ sơ đội">
    <button type="button" className="op-back" disabled={busy} onClick={onBack}><ArrowLeft size={17} /> Quay lại</button>
    {error && <p role="alert" className="op-error">{error}</p>}{notice && <p role="status" className="op-notice">{notice}</p>}
    {!profile ? <>{!error && <p role="status">Đang tải hồ sơ…</p>}</> : <>
      <header className="tp-heading"><div className="tp-logo" aria-hidden="true">{profile.team.tag}</div><div><h1>{profile.team.name}</h1><p>{profile.team.tag}</p></div>{profile.canManage && <button type="button" disabled={busy} onClick={() => setEditing(!editing)}>Sửa hồ sơ</button>}</header>
      {editing && profile.directoryTeam && <form className="op-panel" onSubmit={event => void save(event, "team")}><h2>Sửa thông tin danh bạ</h2><label>Tên đội<input name="name" required maxLength={80} defaultValue={profile.directoryTeam.name} /></label><label>Tên viết tắt<input name="tag" required maxLength={12} defaultValue={profile.directoryTeam.tag} /></label><label>Giới thiệu<textarea name="description" maxLength={1000} rows={3} defaultValue={profile.directoryTeam.description || ""} /></label><button type="submit" className="op-primary" disabled={busy}>Lưu hồ sơ</button><button type="button" disabled={busy} onClick={() => setEditing(false)}>Hủy</button></form>}
      {renderMediaEditor?.(profile, refresh)}
      <section className="tp-roster"><div className="tp-section-heading"><h2>Danh sách đăng ký{profile.registration ? ` · ${profile.registration.players.length} người` : ""}</h2><label>Giải đấu<select value={selected} disabled={busy} onChange={event => { setSelected(event.target.value); setNotice(""); }}>{canSelectDirectory && <option value="">Chọn giải</option>}{tournaments.filter(event => canSelectDirectory || event.registrations.some(item => item.team.id === teamId)).map(event => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label>{profile.canAdd && <button type="button" disabled={busy} onClick={() => setAdding(!adding)}><Plus size={17} /> Thêm thành viên</button>}</div>
        {!selected ? <p>Chọn giải để xem danh sách đăng ký.</p> : !profile.registration ? <p>Đội chưa đăng ký trong giải này.</p> : !profile.registration.players.length ? <p>Chưa đăng ký tuyển thủ.</p> : <div className="tp-member-grid">{profile.registration.players.map(player => <article key={player.id} className="tp-member"><div className="tp-portrait" aria-hidden="true"><span>{player.handle.slice(0, 2).toLocaleUpperCase("vi")}</span></div><div className="tp-member-info"><h3>{player.handle}</h3>{player.name && <p>{player.name}</p>}<p>{player.position || "Chưa chọn vị trí"}</p></div></article>)}</div>}
        {profile.registration?.lockedAt && <p>Danh sách đã khóa. Thêm người cần lý do duyệt.</p>}
        {adding && <form className="op-panel tp-add" onSubmit={event => void save(event, "member")}><h3>Thêm thành viên</h3><label>Nguồn tuyển thủ<select disabled={busy} value={source} onChange={event => setSource(event.target.value)}><option value="new">Tạo tuyển thủ mới</option><option value="existing">Chọn từ danh bạ</option></select></label>{source === "new" ? <><label>Nickname<input name="handle" required maxLength={80} autoFocus disabled={busy} /></label><label>Họ tên (tùy chọn)<input name="name" maxLength={80} disabled={busy} /></label><label>Vị trí (tùy chọn)<select name="position" disabled={busy}><option value="">Chưa chọn</option>{["Top", "Jungle", "Mid", "ADC", "Support"].map(value => <option key={value}>{value}</option>)}</select></label></> : <label>Tuyển thủ<select name="playerId" required disabled={busy}><option value="">Chọn tuyển thủ</option>{candidates.map(player => <option key={player.id} value={player.id}>{player.handle}{player.name ? ` · ${player.name}` : ""}</option>)}</select></label>}{profile.registration?.lockedAt && <label>Lý do duyệt<textarea name="reason" required maxLength={1000} rows={3} disabled={busy} /></label>}<div className="op-inline-actions"><button type="submit" className="op-primary" disabled={busy}>{busy ? "Đang lưu…" : profile.registration?.lockedAt ? "Duyệt bổ sung" : "Thêm thành viên"}</button><button type="button" disabled={busy} onClick={() => setAdding(false)}>Hủy</button></div></form>}
      </section>
      <div className="tp-details"><section><h2>Giới thiệu</h2><p>{profile.team.description || "Chưa có giới thiệu."}</p></section><section><h2>Giải tham dự</h2>{profile.participations.length ? <ul>{profile.participations.map(event => <li key={event.id}><button type="button" disabled={busy} onClick={() => setSelected(event.id)}>{event.name}</button></li>)}</ul> : <p>Chưa có giải tham dự.</p>}</section></div>
      <section><h2>Lịch và kết quả</h2>{profile.matches.length ? <ul className="tp-matches">{profile.matches.map(match => <li key={match.id}><div><strong>{match.teams.map(id => profile.opponents.find(team => team.id === id)?.name || "Chờ đội").join(" — ")}</strong><p>{match.scheduledAt ? new Date(match.scheduledAt).toLocaleString("vi-VN") : "Chưa có lịch"} · {match.score.join("–")} · {({ waiting: "Chờ đủ điều kiện", ready: "Sẵn sàng", in_progress: "Đang vận hành", completed: "Hoàn tất", skipped: "Không diễn ra" })[match.status]}</p></div>{onOpenMatch && selected && <button type="button" onClick={() => onOpenMatch(selected, match.id)}>Xem trận</button>}</li>)}</ul> : <p>{selected ? "Chưa có trận đấu của đội." : "Chọn giải để xem trận đấu."}</p>}</section>
      {error && <button type="button" disabled={busy} onClick={() => void refresh().catch(problem => setError(problem.message))}>Tải lại hồ sơ</button>}
    </>}
  </section>;
}
