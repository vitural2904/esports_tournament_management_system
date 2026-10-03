export type Source = { kind: "team"; teamId: string } | { kind: "seed"; stageId: string; groupId: string; rank: number } | { kind: "placement"; stageId: string; rank: number } | { kind: "winner" | "loser"; matchId: string };
export type StageType = "round_robin" | "single_elimination" | "double_elimination";
export type Group = { id: string; name: string; inputs: Source[] };
export type Stage = { id: string; name: string; type: StageType; bo: number; rounds?: number; groups?: Group[]; inputs?: Source[]; finalBo?: number; reset?: boolean; matchBo?: Record<string, number> };
export type Format = { version: 1; stages: Stage[] };
export type GraphMatch = { id: string; key: string; stageId: string; branch: string; round: number; bo: number; sources: Source[]; groupId?: string; condition?: { kind: "reset"; matchId: string; challenger: Source } };
export function compileFormat(input: Format, teamIds: string[], options?: { requireAllTeams?: boolean }): { format: Format; matches: GraphMatch[] };
export function createPreset(kind: StageType | "demo", teamIds: string[]): Format;
