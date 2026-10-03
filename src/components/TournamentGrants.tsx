import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { api } from "../lib/api";
import type { Account, Grant, TournamentRole } from "../lib/api";

export default function TournamentGrants({ tournamentId, organizationAccounts }: { tournamentId: string; organizationAccounts?: Account[] }) {
  const [loadedAccounts, setAccounts] = useState<Account[]>([]);
  const accounts = (organizationAccounts || loadedAccounts).filter(user => !user.admin);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [selected, setSelected] = useState("");
  const [roles, setRoles] = useState<TournamentRole[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let current = true;
    void Promise.all([api<{ users: Account[] }>("/users"), api<{ grants: Grant[] }>(`/tournaments/${tournamentId}/grants`)]).then(([users, result]) => {
      if (current) { setAccounts(users.users.filter(user => !user.admin)); setGrants(result.grants); }
    }).catch(problem => { if (current) setError(problem.message); }).finally(() => { if (current) setBusy(false); });
    return () => { current = false; };
  }, [tournamentId]);
  function select(id: string) { setSelected(id); setRoles(grants.find(grant => grant.userId === id)?.roles || []); setNotice(""); }
  function toggle(role: TournamentRole) { setRoles(current => current.includes(role) ? current.filter(value => value !== role) : [...current, role]); }
  async function save() {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await api<{ grant: Grant }>(`/tournaments/${tournamentId}/grants`, { userId: selected, roles, revision: grants.find(grant => grant.userId === selected)?.revision || 0 });
      setGrants(current => [...current.filter(grant => grant.userId !== selected), result.grant]); setNotice(roles.length ? "Đã lưu quyền cho giải này." : "Đã thu hồi quyền cho giải này.");
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể lưu quyền."); }
    finally { setBusy(false); }
  }
  return <section className="op-panel"><h2>Thành viên của giải</h2><p>Chọn một hoặc cả hai vị trí. Bỏ cả hai để thu hồi quyền.</p>
    {error && <p role="alert" className="op-error">{error}</p>}{notice && <p role="status" className="op-notice">{notice}</p>}
    {accounts.length ? <form onSubmit={event => { event.preventDefault(); void save(); }}><label>Thành viên<select required value={selected} disabled={busy} onChange={event => select(event.target.value)}><option value="">Chọn thành viên</option>{accounts.map(user => <option key={user.id} value={user.id}>{user.displayName} · {user.username}</option>)}</select></label>
    <fieldset disabled={busy || !selected}><legend>Vị trí trong giải</legend><div className="op-player-options"><label><input type="checkbox" checked={roles.includes("operator")} onChange={() => toggle("operator")} /><span>Điều hành<small>Chuẩn bị giải, xác nhận kết quả.</small></span></label><label><input type="checkbox" checked={roles.includes("entry")} onChange={() => toggle("entry")} /><span>Nhập liệu<small>Lưu nháp và gửi game.</small></span></label></div></fieldset>
    <motion.button className="op-primary" type="submit" disabled={busy || !selected} whileTap={{ scale: .98 }}>{busy ? "Đang xử lý…" : "Lưu quyền"}</motion.button></form> : <p>{busy ? "Đang tải…" : "Cấp tài khoản thành viên trước để gán quyền."}</p>}
    <ul className="op-users">{grants.filter(grant => grant.roles.length).map(grant => <li key={grant.userId}><strong>{accounts.find(user => user.id === grant.userId)?.displayName || "Thành viên"}</strong><span>{grant.roles.map(role => role === "operator" ? "Điều hành" : "Nhập liệu").join(" · ")}</span></li>)}</ul>
  </section>;
}
