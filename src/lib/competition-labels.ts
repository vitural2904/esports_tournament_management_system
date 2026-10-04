import type { Format } from "../../shared/format.mjs";
import type { Match, Tournament } from "./api";

export function stageName(event: Tournament, stageId: string) {
  return (event.format as Format | null)?.stages.find(stage => stage.id === stageId)?.name || stageId;
}

export function matchName(event: Tournament, match: Match) {
  const stage = (event.format as Format | null)?.stages.find(stage => stage.id === match.stageId);
  const place = match.branch === "tiebreak" ? `${stage?.groups?.find(group => group.id === match.groupId)?.name || "Bảng"} · Phân hạng lượt ${match.round}` : match.key;
  return `${stage?.name || match.stageId} · ${place}`;
}

export function matchReference(event: Tournament, id: string) {
  const [stageId, key] = id.split(":");
  return `${stageName(event, stageId)} · ${key.startsWith("TB-") ? "Trận phụ phân hạng" : key}`;
}
