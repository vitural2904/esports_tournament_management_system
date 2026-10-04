import type { HistoryItem, Match, ResultHistoryItem, Tournament } from "../lib/api";
import GameFacts from "./GameFacts";
import { matchName } from "../lib/competition-labels";
import "./MatchChange.css";
const titles: Record<string, string> = { game_edit: "Sửa game", game_walkover: "Xử thắng game", match_walkover: "Xử thắng trận" };

export default function ResultHistory({ event, items: allItems }: { event: Tournament; items: HistoryItem[] }) {
  const items = allItems.filter((item): item is ResultHistoryItem => item.action !== "roster_addition");
  const name = (id: string | null | undefined) => event.registrations.find(item => item.team.id === id)?.team.name || "Chưa xác định";
  function snapshot(match: Match) {
    return <><p>Đội thắng trận: {name(match.winnerId)}</p>{match.decision && <p>Quyết định: {match.decision.reason}</p>}{match.games.map(game => <GameFacts key={game.number} game={game} event={event} />)}</>;
  }
  return <details className="mc-history"><summary>Lịch sử kết quả · {items.length} thay đổi</summary>{items.length ? items.map(item => <article key={item.id}><h4>{titles[item.action] || item.action} · {matchName(event, item.after)}</h4><small>{item.actor.displayName} · {new Date(item.createdAt).toLocaleString("vi-VN")}</small><p>{item.reason}</p><details><summary>Xem dữ liệu trước và sau</summary><div className="mc-comparison"><section><h4>Trước</h4>{snapshot(item.before)}</section><section><h4>Sau</h4>{snapshot(item.after)}</section></div></details></article>) : <p>Chưa có sửa kết quả hoặc quyết định xử thắng.</p>}</details>;
}
