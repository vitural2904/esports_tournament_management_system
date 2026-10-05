import { lazy, Suspense, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { MotionConfig, motion } from "motion/react";
import { ArrowUpRight, LogOut, Swords } from "lucide-react";
import AmbientWaves from "./AmbientWaves";
import DirectoryWorkspace from "./DirectoryWorkspace";
import MemberTournaments from "./MemberTournaments";
import { api } from "../lib/api";
import type { Account } from "../lib/api";
import "./OperationsApp.css";

const IdentityPrototype = lazy(() => import("./IdentityPrototype"));
const AccountAdministration = lazy(() => import("./AccountAdministration"));

export default function OperationsApp() {
  const [user, setUser] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [adminView, setAdminView] = useState(() => { const view = new URLSearchParams(window.location.search).get("view"); return view === "accounts" || view === "directory" ? view : "tournaments"; });
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
  async function refreshAccounts() {
    const result = await api<{ users: Account[] }>("/users");
    setAccounts(result.users);
    const own = result.users.find(account => account.id === user?.id);
    if (own) setUser(own);
    return result.users;
  }
  function navigateAdmin(view: string) {
    setAdminView(view);
    const url = new URL(window.location.href);
    if (view !== "tournaments") url.searchParams.set("view", view);
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  }
  async function logout() {
    setBusy(true); setError("");
    try { await api("/logout", {}); setUser(null); setAccounts([]); setAdminView("tournaments"); setChangingPassword(false); setNotice(""); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể đăng xuất."); }
    finally { setBusy(false); }
  }
  const button = (label: string) => <motion.button className="op-primary" type="submit" disabled={busy} whileTap={{ scale: .98 }}>{busy ? "Đang xử lý…" : label}<ArrowUpRight size={18} /></motion.button>;
  return <MotionConfig reducedMotion="user"><div className="op-shell"><AmbientWaves /><header className="op-header"><a href="?app=operations" className="brand"><span className="brand-mark"><Swords size={19} /></span>bracket<span className="vd-brand-period">.</span></a>{user && <div><span>{user.displayName}</span>{!user.mustChangePassword && <button type="button" disabled={busy} onClick={() => { setChangingPassword(true); setError(""); setNotice(""); }}>Đổi mật khẩu</button>}<button type="button" disabled={busy} onClick={() => void logout()}><LogOut size={17} /> Đăng xuất</button></div>}</header><main className={user && !user.mustChangePassword && !changingPassword ? "op-workspace" : "op-auth"}>
    {error && <p className="op-error" role="alert">{error}</p>}{notice && <p className="op-notice" role="status">{notice}</p>}
    {!ready ? <section className="op-panel"><h1>Kết nối không gian làm việc</h1><p>Đang kiểm tra máy chủ.</p><button type="button" onClick={() => void load()}>Thử lại</button></section> : !user ? <section className="op-panel"><h1>{setup ? "Tạo không gian làm việc" : "Đăng nhập"}</h1><p>{setup ? "Tạo tài khoản quản trị đầu tiên cho ban tổ chức." : "Dùng tài khoản do ban tổ chức cấp."}</p><form onSubmit={signIn}>{setup && <label>Tên hiển thị<input name="displayName" autoComplete="name" required maxLength={80} /></label>}<label>Tên đăng nhập<input name="username" autoComplete="username" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9_.\-]+" /></label><label>Mật khẩu<input name="password" type="password" autoComplete={setup ? "new-password" : "current-password"} required minLength={12} maxLength={128} /></label>{setup && <small>Từ 12 ký tự. Tài khoản đầu tiên có quyền quản trị.</small>}{button(setup ? "Tạo quản trị" : "Đăng nhập")}</form><a className="op-preview" href="?">Xem giao diện mẫu <ArrowUpRight size={16} /></a></section> : (user.mustChangePassword || changingPassword) ? <section className="op-panel"><h1>{user.mustChangePassword ? "Đổi mật khẩu lần đầu" : "Đổi mật khẩu"}</h1><p>{user.mustChangePassword ? "Tạo mật khẩu riêng trước khi dùng ứng dụng." : "Các phiên cũ sẽ đăng xuất khi lưu mật khẩu mới."}</p><form onSubmit={changePassword}><label>Mật khẩu hiện tại<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></label><label>Mật khẩu mới<input name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label><label>Nhập lại mật khẩu mới<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>{button("Lưu mật khẩu mới")}{!user.mustChangePassword && <button type="button" disabled={busy} onClick={() => setChangingPassword(false)}>Quay lại</button>}</form></section> : import.meta.env.DEV && new URLSearchParams(window.location.search).get("prototype") === "identity" ? <Suspense fallback={<p role="status">Đang tải mẫu thiết kế…</p>}><IdentityPrototype /></Suspense> : <>{user.role !== "referee" ? <><nav className="op-admin-nav" aria-label="Quản trị"><button type="button" aria-current={adminView === "tournaments" ? "page" : undefined} onClick={() => navigateAdmin("tournaments")}>Giải đấu</button><button type="button" aria-current={adminView === "directory" ? "page" : undefined} onClick={() => navigateAdmin("directory")}>Danh bạ</button>{user.admin && <button type="button" aria-current={user.admin && adminView === "accounts" ? "page" : undefined} onClick={() => navigateAdmin("accounts")}>Tài khoản</button>}</nav>{user.admin && adminView === "accounts" ? <Suspense fallback={<p role="status">Đang tải quản trị tài khoản…</p>}><AccountAdministration accounts={accounts} currentUserId={user.id} onChanged={refreshAccounts} /></Suspense> : <DirectoryWorkspace key={adminView} readOnly={user.role === "caster"} directoryOnly={adminView === "directory"} />}</> : <MemberTournaments />}</>}
  </main></div></MotionConfig>;
}
