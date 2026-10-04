import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { motion } from "motion/react";
import { Search, UserPlus } from "lucide-react";
import { api } from "../lib/api";
import type { Account, AccountHistoryItem, Tournament, TournamentRole } from "../lib/api";
import "./AccountAdministration.css";

const actions: Record<string, string> = { account_created: "Cấp tài khoản", account_update: "Sửa tài khoản", password_reset: "Đặt mật khẩu tạm", password_changed: "Đổi mật khẩu", sessions_revoked: "Thu hồi phiên", grant_changed: "Đổi quyền theo giải" };
const status = (account: Account) => account.disabled ? "Bị khóa" : account.mustChangePassword ? "Chờ đổi mật khẩu" : "Hoạt động";
const roleNames = (roles: TournamentRole[]) => roles.map(role => role === "operator" ? "Điều hành" : "Nhập liệu").join(" · ");

export default function AccountAdministration({ accounts, currentUserId, onChanged }: { accounts: Account[]; currentUserId: string; onChanged: () => Promise<Account[]> }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Account | null>(null);
  const [history, setHistory] = useState<AccountHistoryItem[]>([]);
  const [events, setEvents] = useState<Tournament[]>([]);
  const [eventId, setEventId] = useState("");
  const [roles, setRoles] = useState<TournamentRole[]>([]);
  const [grantRevision, setGrantRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let current = true;
    void api<{ tournaments: Tournament[] }>("/tournaments").then(value => { if (current) setEvents(value.tournaments); }).catch(problem => { if (current) setError(problem.message); });
    return () => { current = false; };
  }, []);
  useEffect(() => {
    let current = true;
    setHistory([]);
    if (selected) void api<{ history: AccountHistoryItem[] }>(`/users/${selected.id}/history`).then(value => { if (current) setHistory(value.history); }).catch(problem => { if (current) setError(problem.message); });
    return () => { current = false; };
  }, [selected?.id, selected?.revision]);
  const self = selected?.id === currentUserId;
  const stale = !!selected && accounts.find(account => account.id === selected.id)?.revision !== selected.revision;
  function choose(account: Account) { setSelected(account); setEventId(""); setError(""); setNotice(""); }
  function chooseEvent(id: string) {
    setEventId(id);
    const grant = selected?.grants?.find(item => item.tournamentId === id);
    setRoles(grant?.roles || []); setGrantRevision(grant?.revision || 0);
  }
  async function run(path: string, body: object, message: string, form?: HTMLFormElement) {
    setBusy(true); setError(""); setNotice("");
    try {
      await api(path, body);
      form?.reset(); setNotice(message);
      try {
        const refreshed = await onChanged();
        if (selected) {
          const updated = refreshed.find(account => account.id === selected.id);
          if (updated) { setSelected(updated); const grant = updated.grants?.find(item => item.tournamentId === eventId); setGrantRevision(grant?.revision || 0); }
          setHistory((await api<{ history: AccountHistoryItem[] }>(`/users/${selected.id}/history`)).history);
        }
      } catch { setError("Đã lưu thao tác. Chưa tải được dữ liệu mới. Bấm Tải lại trước khi sửa tiếp."); }
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể hoàn tất."); }
    finally { setBusy(false); }
  }
  async function refresh() {
    setBusy(true); setError("");
    try { const fresh = await onChanged(); if (selected) choose(fresh.find(account => account.id === selected.id) || selected); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể tải lại."); }
    finally { setBusy(false); }
  }
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
    void run("/users", { username: data.get("username"), displayName: data.get("displayName"), password: data.get("password") }, "Đã cấp tài khoản. Thành viên phải đổi mật khẩu lần đầu.", form);
  }
  const visible = accounts.filter(account => `${account.displayName} ${account.username}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")) && (filter === "all" || (filter === "disabled" ? account.disabled : filter === "admin" ? account.admin : !account.disabled && !account.mustChangePassword)));
  return <div className="account-admin">
    <section className="op-panel"><div className="account-heading"><div><h2>Tài khoản</h2><p>{accounts.length} thành viên trong ban tổ chức.</p></div><button type="button" disabled={busy} onClick={() => void refresh()}>Tải lại</button></div>
      {error && <p className="op-error" role="alert">{error}</p>}{notice && <p className="op-notice" role="status">{notice}</p>}
      <div className="account-filters"><label><span><Search size={16} /> Tìm thành viên</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tên hoặc tên đăng nhập" /></label><label>Hiển thị<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Tất cả</option><option value="active">Hoạt động</option><option value="disabled">Bị khóa</option><option value="admin">Quản trị</option></select></label></div>
      <div className="account-table" role="region" aria-label="Danh sách tài khoản" tabIndex={0}><table><thead><tr><th>Thành viên</th><th>Trạng thái</th><th>Quyền</th><th>Thao tác</th></tr></thead><tbody>{visible.map(account => <tr key={account.id}><td><strong>{account.displayName}</strong><span>{account.username}{account.id === currentUserId ? " · Bạn" : ""}</span></td><td>{status(account)}</td><td>{account.admin ? "Quản trị toàn tổ chức" : account.grants?.filter(grant => grant.roles.length).map(grant => <span key={grant.tournamentId}>{grant.tournamentName}: {roleNames(grant.roles)}</span>)}{!account.admin && !account.grants?.some(grant => grant.roles.length) && "Chưa có quyền giải"}</td><td><button type="button" disabled={busy} aria-pressed={selected?.id === account.id} onClick={() => choose(account)}>Quản lý<span className="sr-only"> {account.username}</span></button></td></tr>)}</tbody></table></div>{!visible.length && <p>Không có thành viên phù hợp.</p>}
    </section>
    {selected && <section className="op-panel account-detail" key={selected.id}><div className="account-heading"><div><h2>{selected.displayName}</h2><p>{selected.username} · {status(selected)}</p></div><button type="button" disabled={busy} onClick={() => setSelected(null)}>Đóng</button></div>
      {stale && <p className="op-error">Tài khoản vừa thay đổi. Bấm Tải lại trước khi sửa.</p>}
      <form key={selected.revision} onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void run(`/users/${selected.id}`, { revision: selected.revision, displayName: data.get("displayName"), ...(!self ? { admin: data.get("admin") === "on" } : {}) }, "Đã lưu tài khoản."); }}><fieldset disabled={busy || stale}><legend>Thông tin tài khoản</legend><label>Tên hiển thị<input name="displayName" defaultValue={selected.displayName} required maxLength={80} /></label><label className="account-check"><input type="checkbox" name="admin" defaultChecked={selected.admin} disabled={self} />Quản trị toàn tổ chức</label><motion.button type="submit" className="op-primary" whileTap={{ scale: .98 }}>Lưu tài khoản</motion.button></fieldset></form>
      {!self && <div className="account-security"><button type="button" disabled={busy || stale} onClick={() => void run(`/users/${selected.id}`, { revision: selected.revision, disabled: !selected.disabled }, selected.disabled ? "Đã mở tài khoản." : "Đã khóa tài khoản. Các phiên đã đăng xuất.")}>{selected.disabled ? "Mở tài khoản" : "Khóa tài khoản"}</button><button type="button" disabled={busy || stale} onClick={() => void run(`/users/${selected.id}/revoke-sessions`, { revision: selected.revision }, "Đã thu hồi mọi phiên đăng nhập.")}>Thu hồi mọi phiên</button></div>}
      {!self && <form onSubmit={event => { event.preventDefault(); const form = event.currentTarget, data = new FormData(form); void run(`/users/${selected.id}/reset-password`, { revision: selected.revision, password: data.get("password") }, "Đã đặt mật khẩu tạm. Phiên cũ đã đăng xuất. Thành viên phải đổi mật khẩu.", form); }}><fieldset disabled={busy || stale}><legend>Đặt lại mật khẩu</legend><label>Mật khẩu tạm<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label><button type="submit">Đặt mật khẩu tạm</button></fieldset></form>}
      {!selected.admin && <form onSubmit={event => { event.preventDefault(); void run(`/tournaments/${eventId}/grants`, { userId: selected.id, roles, revision: grantRevision }, "Đã lưu quyền theo giải."); }}><fieldset disabled={busy || stale || selected.disabled}><legend>Quyền theo giải</legend><label>Giải đấu<select required value={eventId} onChange={event => chooseEvent(event.target.value)}><option value="">Chọn giải</option>{events.map(tournament => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}</select></label>{(["operator", "entry"] as const).map(role => <label className="account-check" key={role}><input type="checkbox" checked={roles.includes(role)} onChange={() => setRoles(current => current.includes(role) ? current.filter(item => item !== role) : [...current, role])} />{role === "operator" ? "Điều hành" : "Nhập liệu"}</label>)}<small>Bỏ cả hai vị trí để thu hồi quyền của giải.</small><button type="submit" disabled={!eventId}>Lưu quyền theo giải</button></fieldset></form>}
      <h3>Lịch sử tài khoản</h3><ol className="account-history">{history.map(item => <li key={item.id}><strong>{actions[item.action] || item.action}</strong><span>{item.actor.displayName} · {new Date(item.createdAt).toLocaleString("vi-VN")}</span>{item.action === "account_update" && <span>{String(item.before?.displayName)} → {String(item.after.displayName)} · {item.after.disabled ? "Bị khóa" : "Mở"} · {item.after.admin ? "Quản trị" : "Thành viên"}</span>}{item.action === "grant_changed" && <span>{events.find(tournament => tournament.id === item.after.tournamentId)?.name || "Giải đấu"} · {roleNames((item.after.roles || []) as TournamentRole[]) || "Thu hồi quyền"}</span>}</li>)}</ol>{!history.length && <p>Chưa có lịch sử.</p>}
    </section>}
    <section className="op-panel"><h2><UserPlus size={20} /> Cấp tài khoản</h2><form onSubmit={create}><fieldset disabled={busy}><legend>Thành viên mới</legend><label>Tên hiển thị<input name="displayName" required maxLength={80} autoComplete="off" /></label><label>Tên đăng nhập<input name="username" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9_.\-]+" autoComplete="off" /></label><label>Mật khẩu tạm<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label><motion.button type="submit" className="op-primary" whileTap={{ scale: .98 }}>Cấp tài khoản</motion.button></fieldset></form></section>
  </div>;
}
