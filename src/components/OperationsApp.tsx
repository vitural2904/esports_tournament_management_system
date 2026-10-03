import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { MotionConfig, motion } from "motion/react";
import { ArrowUpRight, LogOut, Swords, Users } from "lucide-react";
import AmbientWaves from "./AmbientWaves";
import { api } from "../lib/api";
import type { Account } from "../lib/api";
import "./OperationsApp.css";

export default function OperationsApp() {
  const [user, setUser] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [changingPassword, setChangingPassword] = useState(false);
  async function load() {
    setError("");
    try {
      const state = await api<{ needed: boolean }>("/setup");
      setSetup(state.needed);
      if (!state.needed) {
        try { const session = await api<{ user: Account }>("/me"); setUser(session.user); }
        catch { setUser(null); }
      }
      setReady(true);
    } catch { setError("Máy chủ chưa sẵn sàng. Chạy ứng dụng rồi thử lại."); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    let current = true;
    if (user?.admin && !user.mustChangePassword) void api<{ users: Account[] }>("/users").then(value => { if (current) setAccounts(value.users); }).catch(problem => { if (current) setError(problem.message); });
    else setAccounts([]);
    return () => { current = false; };
  }, [user]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await api<{ user: Account }>(setup ? "/setup" : "/login", { username: data.get("username"), password: data.get("password"), ...(setup ? { displayName: data.get("displayName") } : {}) });
      setUser(result.user); setSetup(false);
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể đăng nhập."); }
    finally { setBusy(false); }
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    if (data.get("newPassword") !== data.get("confirmPassword")) { setError("Hai mật khẩu mới chưa giống nhau."); setBusy(false); return; }
    try {
      const result = await api<{ user: Account }>("/password", { currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword") });
      setUser(result.user); setChangingPassword(false); setNotice("Đã đổi mật khẩu. Các phiên cũ đã đăng xuất.");
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể đổi mật khẩu."); }
    finally { setBusy(false); }
  }
  async function provision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api("/users", { username: data.get("username"), displayName: data.get("displayName"), password: data.get("password") });
      const result = await api<{ users: Account[] }>("/users"); setAccounts(result.users); form.reset(); setNotice("Đã cấp tài khoản. Thành viên phải đổi mật khẩu ở lần đầu.");
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể cấp tài khoản."); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError("");
    try { await api("/logout", {}); setUser(null); setAccounts([]); setChangingPassword(false); setNotice(""); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể đăng xuất."); }
    finally { setBusy(false); }
  }
  const button = (label: string) => <motion.button className="op-primary" type="submit" disabled={busy} whileTap={{ scale: .98 }}>{busy ? "Đang xử lý…" : label}<ArrowUpRight size={18} /></motion.button>;
  return <MotionConfig reducedMotion="user"><div className="op-shell"><AmbientWaves /><header className="op-header"><a href="?app=operations" className="brand"><span className="brand-mark"><Swords size={19} /></span>bracket<span className="vd-brand-period">.</span></a>{user && <div><span>{user.displayName}</span>{!user.mustChangePassword && <button type="button" disabled={busy} onClick={() => { setChangingPassword(true); setError(""); setNotice(""); }}>Đổi mật khẩu</button>}<button type="button" disabled={busy} onClick={() => void logout()}><LogOut size={17} /> Đăng xuất</button></div>}</header><main className={user && !user.mustChangePassword && !changingPassword ? "op-workspace" : "op-auth"}>
    {error && <p className="op-error" role="alert">{error}</p>}{notice && <p className="op-notice" role="status">{notice}</p>}
    {!ready ? <section className="op-panel"><h1>Kết nối không gian làm việc</h1><p>Đang kiểm tra máy chủ.</p><button type="button" onClick={() => void load()}>Thử lại</button></section> : !user ? <section className="op-panel"><h1>{setup ? "Tạo không gian làm việc" : "Đăng nhập"}</h1><p>{setup ? "Tạo tài khoản quản trị đầu tiên cho ban tổ chức." : "Dùng tài khoản do ban tổ chức cấp."}</p><form onSubmit={signIn}>{setup && <label>Tên hiển thị<input name="displayName" autoComplete="name" required maxLength={80} /></label>}<label>Tên đăng nhập<input name="username" autoComplete="username" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9_.\-]+" /></label><label>Mật khẩu<input name="password" type="password" autoComplete={setup ? "new-password" : "current-password"} required minLength={12} maxLength={128} /></label>{setup && <small>Từ 12 ký tự. Tài khoản đầu tiên có quyền quản trị.</small>}{button(setup ? "Tạo quản trị" : "Đăng nhập")}</form><a className="op-preview" href="?">Xem giao diện mẫu <ArrowUpRight size={16} /></a></section> : (user.mustChangePassword || changingPassword) ? <section className="op-panel"><h1>{user.mustChangePassword ? "Đổi mật khẩu lần đầu" : "Đổi mật khẩu"}</h1><p>{user.mustChangePassword ? "Tạo mật khẩu riêng trước khi dùng ứng dụng." : "Các phiên cũ sẽ đăng xuất khi lưu mật khẩu mới."}</p><form onSubmit={changePassword}><label>Mật khẩu hiện tại<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></label><label>Mật khẩu mới<input name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label><label>Nhập lại mật khẩu mới<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>{button("Lưu mật khẩu mới")}{!user.mustChangePassword && <button type="button" disabled={busy} onClick={() => setChangingPassword(false)}>Quay lại</button>}</form></section> : <><section className="op-page-title"><h1>Không gian làm việc</h1><p>{user.admin ? "Quản trị ban tổ chức" : "Thành viên ban tổ chức"}</p></section><section className="op-panel"><h2>Giải đấu</h2><p>Chưa có giải được cấp cho bạn. Phần tạo và gán quyền theo giải đang được xây.</p><a className="op-preview" href="?">Xem dashboard mẫu <ArrowUpRight size={16} /></a></section>{user.admin && <div className="op-grid"><section className="op-panel"><h2><Users size={20} /> Cấp tài khoản</h2><p>Thành viên đổi mật khẩu ở lần đăng nhập đầu.</p><form onSubmit={provision}><label>Tên hiển thị<input name="displayName" autoComplete="off" required maxLength={80} /></label><label>Tên đăng nhập<input name="username" autoComplete="off" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9_.\-]+" /></label><label>Mật khẩu tạm<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>{button("Cấp tài khoản")}</form></section><section className="op-panel"><h2>Thành viên</h2><ul className="op-users">{accounts.map(account => <li key={account.id}><strong>{account.displayName}</strong><span>{account.username}</span><small>{account.admin ? "Quản trị" : account.mustChangePassword ? "Chờ đổi mật khẩu" : "Thành viên"}</small></li>)}</ul></section></div>}</>}
  </main></div></MotionConfig>;
}
