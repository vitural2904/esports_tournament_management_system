export type Account = { id: string; username: string; displayName: string; admin: boolean; mustChangePassword: boolean };

export async function api<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`/api${path}`, { method: body ? "POST" : "GET", credentials: "same-origin", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const value = await response.json().catch(() => ({ error: "Máy chủ chưa sẵn sàng. Thử lại." }));
  if (!response.ok) throw new Error(value.error || "Không thể hoàn tất thao tác.");
  return value;
}
