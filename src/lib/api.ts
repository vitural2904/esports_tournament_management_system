export type Account = { id: string; username: string; displayName: string; admin: boolean; mustChangePassword: boolean };
export type Team = { id: string; name: string; tag: string; revision: number; archived: boolean };
export type Player = { id: string; name: string; handle: string; revision: number; archived: boolean };
export type Registration = { team: Pick<Team, "id" | "name" | "tag">; players: Pick<Player, "id" | "name" | "handle">[]; revision: number; lockedAt: string | null };
export type Tournament = { id: string; name: string; revision: number; lockedAt: string | null; format: unknown; registrations: Registration[] };

export async function api<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`/api${path}`, { method: body ? "POST" : "GET", credentials: "same-origin", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const value = await response.json().catch(() => ({ error: "Máy chủ chưa sẵn sàng. Thử lại." }));
  if (!response.ok) throw new Error(value.error || "Không thể hoàn tất thao tác.");
  return value;
}
