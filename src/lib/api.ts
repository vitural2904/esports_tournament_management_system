export type Account = { id: string; username: string; displayName: string; admin: boolean; mustChangePassword: boolean; disabled: boolean; revision: number; grants?: { tournamentId: string; tournamentName: string; roles: TournamentRole[]; revision: number }[] };
export type AccountHistoryItem = { id: string; action: string; actor: { id: string; displayName: string }; before: Record<string, unknown> | null; after: Record<string, unknown>; createdAt: string };
export type MediaAsset = { id: string; width: number; height: number; light: boolean; x: number; y: number };
export type IdentityMedia = { logo?: MediaAsset; cover?: MediaAsset; portrait?: MediaAsset };
export type PlayerPosition = "" | "Top" | "Jungle" | "Mid" | "ADC" | "Support";
export type Team = { id: string; name: string; tag: string; description?: string; media?: IdentityMedia; revision: number; archived: boolean };
export type Player = { id: string; name: string; handle: string; position?: PlayerPosition; media?: IdentityMedia; revision: number; archived: boolean };
export type Registration = { team: Pick<Team, "id" | "name" | "tag" | "description" | "media">; players: Pick<Player, "id" | "name" | "handle" | "position" | "media">[]; revision: number; lockedAt: string | null };
export type TournamentRole = "operator" | "entry";
export type Grant = { userId: string; roles: TournamentRole[]; revision: number };
export type Tournament = { id: string; name: string; revision: number; lockedAt: string | null; format: unknown; registrations: Registration[]; roles: TournamentRole[] };
export type GameData = { winnerId?: string; durationSeconds?: number; blueTeamId?: string; redTeamId?: string; patch?: string; lineups?: Record<string, string[]>; pickBan?: Partial<Record<"bluePicks" | "redPicks" | "blueBans" | "redBans", string[]>> };
export type Decision = { reason: string; actorId: string; createdAt: string; winnerId?: string };
export type Game = { number: number; state: "draft" | "submitted" | "confirmed"; data: GameData; revision: number; submittedBy: string | null; confirmedBy: string | null; decision: Decision | null };
export type Match = import("../../shared/format.mjs").GraphMatch & { revision: number; scheduledAt: string | null; startedAt: string | null; teams: (string | null)[]; score: number[]; winnerId: string | null; status: "waiting" | "ready" | "in_progress" | "completed" | "skipped"; games: Game[]; decision: Decision | null };
type HistoryEntry = { id: string; actor: { id: string; displayName: string }; targetId: string; reason: string; createdAt: string };
export type ResultHistoryItem = HistoryEntry & { action: "game_edit" | "game_walkover" | "match_walkover"; before: Match; after: Match };
export type RosterHistoryItem = HistoryEntry & { action: "roster_addition"; before: Registration; after: Registration };
export type HistoryItem = ResultHistoryItem | RosterHistoryItem;
export type Standings = { completed: boolean; championId: string | null; groups: { stageId: string; stageName: string; groupId: string; name: string; completed: boolean; rows: { teamId: string | null; points: number; wins: number; losses: number; rank: number | null }[] }[] };

export async function api<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`/api${path}`, { method: body ? "POST" : "GET", credentials: "same-origin", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const value = await response.json().catch(() => ({ error: "Máy chủ chưa sẵn sàng. Thử lại." }));
  if (!response.ok) throw new Error(value.error || "Không thể hoàn tất thao tác.");
  return value;
}

export type TeamProfileData = { team: Registration["team"]; directoryTeam: Team | null; registration: Registration | null; tournament: { id: string; name: string } | null; participations: { id: string; name: string }[]; opponents: Registration["team"][]; matches: Match[]; canManage: boolean; canAdd: boolean };
