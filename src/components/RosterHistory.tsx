import type { HistoryItem, RosterHistoryItem } from "../lib/api";
import "./MatchChange.css";

export default function RosterHistory({ items: allItems }: { items: HistoryItem[] }) {
  const items = allItems.filter((item): item is RosterHistoryItem => item.action === "roster_addition");
  return <details className="mc-history"><summary>Lịch sử đăng ký · {items.length} lần bổ sung</summary>{items.length ? items.map(item => {
    const oldIds = new Set(item.before.players.map(player => player.id));
    const added = item.after.players.filter(player => !oldIds.has(player.id));
    return <article key={item.id}><h4>Bổ sung · {item.after.team.name}</h4><small>{item.actor.displayName} · {new Date(item.createdAt).toLocaleString("vi-VN")}</small><p>{item.reason}</p><p>Tuyển thủ được duyệt: {added.map(player => player.handle).join(" · ")}</p><details><summary>Xem danh sách trước và sau</summary><div className="mc-comparison"><section><h4>Trước · {item.before.players.length} người</h4><p>{item.before.players.map(player => player.handle).join(" · ") || "Chưa có tuyển thủ"}</p></section><section><h4>Sau · {item.after.players.length} người</h4><p>{item.after.players.map(player => player.handle).join(" · ")}</p></section></div></details></article>;
  }) : <p>Chưa có bổ sung sau khóa.</p>}</details>;
}
