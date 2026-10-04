import { motion, useReducedMotion } from "motion/react";
import { Trophy } from "lucide-react";
import type { Match, Standings, Tournament } from "../lib/api";
import type { Source } from "../../shared/format.mjs";
import { stageName } from "../lib/competition-labels";
import "./CompetitionProgress.css";
import type { MatchSignal } from "../../shared/match-signals.mjs";
import { MatchSchedule, MatchStatus } from "./MatchSignals";

const branches = { upper: "Nhánh thắng", lower: "Nhánh thua", final: "Chung kết tổng", tiebreak: "Trận phụ phân hạng" };

export default function CompetitionProgress({ event, matches, signals, standings, busy, onSelect }: { event: Tournament; matches: Match[]; signals: Record<string, MatchSignal>; standings: Standings; busy: boolean; onSelect: (match: Match) => void }) {
  const reduced = useReducedMotion();
  const teamName = (id: string | null) => event.registrations.find(item => item.team.id === id)?.team.name || "Chưa xác định";
  function sourceName(source: Source) {
    if (source.kind === "team") return "Đội đăng ký";
    if (source.kind === "seed") return `Seed ${source.groupId}${source.rank}`;
    if (source.kind === "placement") return `${source.stageId} · hạng ${source.rank}`;
    return `${source.kind === "winner" ? "Thắng" : "Thua"} ${source.matchId.split(":").at(-1)}`;
  }
  const stageIds = [...new Set(matches.filter(match => match.branch !== "group").map(match => match.stageId))];
  return <section className="cp-shell" aria-label="Bảng điểm và nhánh đấu">
    {standings.completed && <div className="cp-champion" role="status"><Trophy size={28} /><div><span>Giải đã kết thúc</span><h3>{standings.championId ? `Nhà vô địch · ${teamName(standings.championId)}` : "Các bảng đã hoàn tất"}</h3></div></div>}
    {standings.groups.length > 0 && <details open className="cp-standings"><summary>Bảng điểm và seed</summary><p>1 trận thắng = 1 điểm. Bằng điểm xét đối đầu. Còn hòa sẽ có trận phụ BO1. Chỉ kết quả đã xác nhận được tính.</p><div className="cp-groups">{standings.groups.map(group => <section key={`${group.stageId}:${group.groupId}`} className="cp-group"><h3>{group.stageName} · {group.name}</h3><span>{group.completed ? "Đã chốt seed" : "Đang thi đấu · seed chưa chốt"}</span><div className="cp-table-scroll"><table><caption className="sr-only">Xếp hạng {group.name}</caption><thead><tr><th scope="col">Seed</th><th scope="col">Đội</th><th scope="col">Thắng</th><th scope="col">Thua</th><th scope="col">Điểm</th></tr></thead><tbody>{group.rows.map((row, index) => <tr key={row.teamId || index}><td>{row.rank ?? "—"}</td><th scope="row">{teamName(row.teamId)}</th><td>{row.wins}</td><td>{row.losses}</td><td>{row.points}</td></tr>)}</tbody></table></div></section>)}</div></details>}
    {stageIds.length > 0 && <details className="cp-brackets"><summary>Nhánh đấu trực tiếp</summary><p>Chọn trận để xem hoặc nhập game. Nguồn thắng/thua nằm dưới tên đội. Kéo ngang để xem các vòng tiếp theo.</p>{stageIds.map(stageId => <section key={stageId} className="cp-stage"><h3>{stageName(event, stageId)}</h3>{(Object.keys(branches) as (keyof typeof branches)[]).filter(branch => matches.some(match => match.stageId === stageId && match.branch === branch)).map(branch => {
      const branchMatches = matches.filter(match => match.stageId === stageId && match.branch === branch);
      const rounds = [...new Set(branchMatches.map(match => match.round))].sort((a, b) => a - b);
      return <section key={branch} className={`cp-branch cp-${branch}`}><h4>{branches[branch]}</h4><div className="cp-rounds" tabIndex={0} role="region" aria-label={`${stageId} · ${branches[branch]}`}>{rounds.map(round => <div key={round} className="cp-round"><h5>Vòng {round}</h5>{branchMatches.filter(match => match.round === round).map(match => <motion.button key={match.id} type="button" className={`cp-match cp-${match.status} signal-row`} data-signal={signals[match.id].borderTone} disabled={busy} onClick={() => onSelect(match)} whileTap={reduced ? undefined : { scale: .98 }}><span>{match.key.startsWith("TB-") ? "Phân hạng BO1" : `${match.key} · BO${match.bo}`}</span>{match.sources.map((source, index) => <div key={index} className={match.winnerId && match.winnerId === match.teams[index] ? "cp-winner" : ""}><strong>{match.teams[index] ? teamName(match.teams[index]) : sourceName(source)}</strong><b>{match.decision ? match.winnerId === match.teams[index] ? "W" : "L" : match.score[index]}</b><small>{sourceName(source)}</small></div>)}<MatchStatus signal={signals[match.id]} decision={!!match.decision} /><MatchSchedule signal={signals[match.id]} /></motion.button>)}</div>)}</div></section>;
    })}</section>)}</details>}
  </section>;
}
