import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../lib/api";
import type { Account, AccountHistoryItem } from "../lib/api";
import "./AccountAdministration.css";

const roleOptions = ["admin", "operator", "referee", "caster"] as const;
const actions: Record<string, string> = { account_created: "Cấp tài khoản", account_update: "Sửa tài khoản", password_reset: "Đặt mật khẩu tạm", password_changed: "Đổi mật khẩu", sessions_revoked: "Thu hồi phiên", grant_changed: "Quyền theo giải cũ" };
const status = (account: Account) => account.disabled ? "Bị khóa" : account.mustChangePassword ? "Chờ đổi mật khẩu" : "Hoạt động";

export default function AccountAdministration({ accounts, currentUserId, onChanged }: { accounts: Account[]; currentUserId: string; onChanged: () => Promise<Account[]> }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<Account | null>(null);
  const [history, setHistory] = useState<AccountHistoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const self = selected?.id === currentUserId;
  const stale = !!selected && accounts.find(account => account.id === selected.id)?.revision !== selected.revision;
  useEffect(() => {
    let current = true;
    setHistory([]);
    if (selected) void api<{ history: AccountHistoryItem[] }>(`/users/${selected.id}/history`).then(value => { if (current) setHistory(value.history); }).catch(problem => { if (current) setError(problem.message); });
    return () => { current = false; };
  }, [selected?.id, selected?.revision]);
  async function run(path: string, body: object, message: string, form?: HTMLFormElement) {
    setBusy(true); setError(""); setNotice("");
    try {
      await api(path, body); form?.reset(); setNotice(message);
      try {
        const fresh = await onChanged();
        if (selected) setSelected(fresh.find(account => account.id === selected.id) || null);
      } catch { setError("Đã lưu. Chưa tải được dữ liệu mới. Bấm Tải lại trước khi sửa tiếp."); }
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể hoàn tất."); }
    finally { setBusy(false); }
  }
  async function refresh() {
    setBusy(true); setError("");
    try { const fresh = await onChanged(); if (selected) setSelected(fresh.find(account => account.id === selected.id) || null); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể tải lại."); }
    finally { setBusy(false); }
  }
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
    void run("/users", { username: data.get("username"), displayName: data.get("displayName"), password: data.get("password"), role: data.get("role") }, "Đã cấp tài khoản. Thành viên phải đổi mật khẩu lần đầu.", form);
  }
  const visible = accounts.filter(account => (roleFilter === "all" || account.role === roleFilter) && `${account.username} ${account.displayName}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  return <div className="account-admin">
    {error && <p role="alert" className="op-error">{error}</p>}{notice && <p role="status" className="op-notice">{notice}</p>}
    <section className="op-panel"><h1>Tài khoản</h1><div className="account-filters"><label>Tìm tài khoản<input value={search} onChange={event => setSearch(event.target.value)} /></label><label>Lọc role<select value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="all">Tất cả role</option>{roleOptions.map(role => <option key={role}>{role}</option>)}</select></label><button type="button" disabled={busy} onClick={() => void refresh()}>Tải lại</button></div><ul className="op-users">{visible.map(account => <li key={account.id}><button type="button" aria-label={`Quản lý ${account.username}`} disabled={busy} onClick={() => { setSelected(account); setError(""); setNotice(""); }}><strong>{account.displayName}</strong><span>{account.username} · {account.role} · {status(account)}</span></button></li>)}</ul></section>
    {selected && <section className="op-panel account-detail"><h2>{selected.displayName}</h2>{stale && <p role="alert">Tài khoản đã thay đổi. Tải lại trước khi sửa.</p>}
      <form key={`${selected.id}/${selected.revision}`} onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void run(`/users/${selected.id}`, { revision: selected.revision, displayName: data.get("displayName"), ...(!self ? { role: data.get("role") } : {}) }, "Đã lưu tài khoản."); }}><fieldset disabled={busy || stale}><legend>Thông tin tài khoản</legend><label>Tên hiển thị<input name="displayName" defaultValue={selected.displayName} required maxLength={80} /></label><label>Role<select name="role" defaultValue={selected.role} disabled={self}>{roleOptions.map(role => <option key={role}>{role}</option>)}</select></label><button type="submit" className="op-primary">Lưu tài khoản</button></fieldset></form>
      {!self && <><div className="account-security"><button type="button" disabled={busy || stale} onClick={() => void run(`/users/${selected.id}`, { revision: selected.revision, disabled: !selected.disabled }, selected.disabled ? "Đã mở tài khoản." : "Đã khóa tài khoản.")}>{selected.disabled ? "Mở tài khoản" : "Khóa tài khoản"}</button><button type="button" disabled={busy || stale} onClick={() => void run(`/users/${selected.id}/revoke-sessions`, { revision: selected.revision }, "Đã thu hồi mọi phiên đăng nhập.")}>Thu hồi mọi phiên</button></div>
      <form onSubmit={event => { event.preventDefault(); const form = event.currentTarget, data = new FormData(form); void run(`/users/${selected.id}/reset-password`, { revision: selected.revision, password: data.get("password") }, "Đã đặt mật khẩu tạm.", form); }}><fieldset disabled={busy || stale}><legend>Đặt lại mật khẩu</legend><label>Mật khẩu tạm<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label><button type="submit">Đặt mật khẩu tạm</button></fieldset></form></>}
      <h3>Lịch sử tài khoản</h3><ol className="account-history">{history.map(item => <li key={item.id}><strong>{actions[item.action] || item.action}</strong><span>{item.actor.displayName} · {new Date(item.createdAt).toLocaleString("vi-VN")}</span>{item.action === "account_update" && <span>{String(item.before?.displayName)} → {String(item.after.displayName)} · {String(item.after.role || "")} · {item.after.disabled ? "Bị khóa" : "Mở"}</span>}</li>)}</ol>{!history.length && <p>Chưa có lịch sử.</p>}
    </section>}
    <section className="op-panel"><h2>Cấp tài khoản</h2><form onSubmit={create}><fieldset disabled={busy}><legend>Thành viên mới</legend><label>Tên hiển thị<input name="displayName" required maxLength={80} autoComplete="off" /></label><label>Tên đăng nhập<input name="username" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9_.\-]+" autoComplete="off" /></label><label>Role<select name="role" defaultValue="caster">{roleOptions.map(role => <option key={role}>{role}</option>)}</select></label><label>Mật khẩu tạm<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label><button type="submit" className="op-primary">Cấp tài khoản</button></fieldset></form></section>
  </div>;
}
