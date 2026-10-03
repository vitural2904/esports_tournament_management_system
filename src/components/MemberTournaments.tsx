import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Tournament } from "../lib/api";
import DirectoryWorkspace from "./DirectoryWorkspace";

export default function MemberTournaments() {
  const [events, setEvents] = useState<Tournament[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let current = true;
    void api<{ tournaments: Tournament[] }>("/tournaments").then(result => { if (current) setEvents(result.tournaments); }).catch(problem => { if (current) setError(problem.message); }).finally(() => { if (current) setReady(true); });
    return () => { current = false; };
  }, []);
  if (events.some(event => event.roles.includes("operator"))) return <DirectoryWorkspace />;
  return <section className="op-panel"><h2>Giải đấu của bạn</h2>{error && <p role="alert" className="op-error">{error}</p>}{!ready ? <p>Đang tải…</p> : events.length ? <ul className="op-users">{events.map(event => <li key={event.id}><strong>{event.name}</strong><span>Nhập liệu · {event.lockedAt ? "Đã chốt thể thức" : "Đang chuẩn bị"}</span><small>{event.registrations.length} đội đăng ký</small></li>)}</ul> : <p>Chưa có giải được cấp cho bạn.</p>}</section>;
}
