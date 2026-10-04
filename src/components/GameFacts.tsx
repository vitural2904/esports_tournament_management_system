import type { Game, Tournament } from "../lib/api";
const pickNames: Record<string, string> = { bluePicks: "Xanh chọn", redPicks: "Đỏ chọn", blueBans: "Xanh cấm", redBans: "Đỏ cấm" };

export default function GameFacts({ game, event }: { game: Game; event: Tournament }) {
  const name = (id: string | null | undefined) => event.registrations.find(item => item.team.id === id)?.team.name || "Chưa xác định";
  return <div><p><strong>Game {game.number}</strong> · {name(game.data.winnerId)}</p>{game.decision && <p>Xử thắng: {game.decision.reason}</p>}{game.data.durationSeconds !== undefined && <p>Thời lượng: {game.data.durationSeconds} giây</p>}{game.data.patch && <p>Phiên bản: {game.data.patch}</p>}{(game.data.blueTeamId || game.data.redTeamId) && <p>Xanh: {name(game.data.blueTeamId)} · Đỏ: {name(game.data.redTeamId)}</p>}{Object.entries(game.data.lineups || {}).map(([teamId, ids]) => <p key={teamId}>Đội hình {name(teamId)}: {ids.map(id => event.registrations.find(item => item.team.id === teamId)?.players.find(player => player.id === id)?.handle || id).join(", ") || "Chưa nhập"}</p>)}{Object.entries(game.data.pickBan || {}).map(([field, names]) => <p key={field}>{pickNames[field]}: {names.join(", ") || "Chưa nhập"}</p>)}</div>;
}
